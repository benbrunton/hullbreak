# Hullbreak — Game Design Document

**Version:** 1.0
**Date:** 2026-03-22
**Status:** Reference document — living spec for active development

---

## Table of Contents

1. [Overview](#1-overview)
2. [Core Mechanic](#2-core-mechanic)
3. [Entity System](#3-entity-system)
4. [Module Types](#4-module-types)
5. [Damage & Fragmentation](#5-damage--fragmentation)
6. [Collection & Ship Building](#6-collection--ship-building)
7. [UI/UX Notes](#7-uiux-notes)
8. [Open Questions](#8-open-questions)

---

## 1. Overview

Hullbreak is a dark, minimalist 2D space game for mobile. The player pilots a ship built from modular blocks through asteroid fields. Everything in the game world — the player's ship, asteroids, and eventually enemies — is made of discrete square blocks on a grid. Destruction is physical and local: a hit removes a specific block, not a health bar. Ships degrade visibly. Asteroids splinter into smaller fragments. Collected wreckage becomes new ship parts.

The game loop is:

1. Navigate asteroid fields while taking as little damage as possible.
2. Selectively destroy asteroids to collect module blocks.
3. Use the ship editor to rebuild and improve the ship between encounters (or on the fly in a pause-edit mode).
4. Survive increasingly dense and dangerous fields.

**Tone:** Cold, mechanical, quiet. The ship feels hand-assembled. The fragility of your craft is the tension. There is no music cue that tells you things are going badly — you watch your ship fall apart in real time.

**Platform:** Mobile (iOS/Android). Portrait or landscape TBD — landscape preferred for ship-editor ergonomics.

---

## 2. Core Mechanic

### The Block World

Every tangible object in the game is a **compound entity**: a cluster of square blocks arranged on a 2D integer grid. There are no smooth meshes, no single-sprite ships. The visual shape of everything is exactly its block layout.

Block size in world space: **16×16 px** (one grid unit).

Each block occupies exactly one cell `{gx, gy}` in its entity's local grid. The entity has a world-space `position` (the origin of its grid, typically at or near its center of mass) and a `rotation`. Blocks are rendered and collided at their world positions derived from this transform.

### Block-Level Physics

- Thrust, drag, and momentum operate at the entity level as before.
- Collision detection operates at the block level: a projectile tests against individual blocks of the target compound entity, not a bounding box.
- AABB broad-phase per entity → per-block narrow-phase if broad-phase hits.

### Fragmentation as Core Loop

The defining moment of Hullbreak is the split. When enough blocks are destroyed from an asteroid or enemy, the remaining blocks may no longer form a single connected group. At that point the cluster is removed and replaced by two or more new entities, each owning its own subset of blocks. This is not a special event — it is the expected result of combat. The game is built around this mechanic.

For the player ship, the same logic applies. A particularly bad collision could split the player's ship. One fragment becomes the new "player" entity (the one containing the **core** block). Other fragments become floating wreckage.

---

## 3. Entity System

### Current Entity Kinds

The existing `GameEntity` union is:

```ts
export type GameEntity = Player | Enemy | Projectile | Particle;
```

This needs to be extended with compound entity support. The recommended approach is to add two new kinds — `asteroid` and `floatingModule` — while refactoring `player` (and eventually `enemy`) to be compound entities backed by a block grid.

### Compound Entity Shape

A compound entity stores its block grid as a `Map` keyed by a serialised grid coordinate string (`"gx,gy"`). This allows O(1) lookup by position and easy iteration.

```ts
// A single block within a compound entity
export type BlockKind =
  | 'hull'
  | 'engine'
  | 'laser'
  | 'shield'
  | 'thruster'
  | 'repair'
  | 'collector';

export type Block = {
  gx: number;            // local grid x
  gy: number;            // local grid y
  kind: BlockKind;
  health: number;        // current HP
  maxHealth: number;     // max HP (varies by kind)
  // Optional per-kind state:
  shieldCharge?: number; // 0–1, for shield blocks
  repairCooldown?: number; // seconds remaining, for repair blocks
};

// Key helper
export function blockKey(gx: number, gy: number): string {
  return `${gx},${gy}`;
}
```

### Compound Entity Base

```ts
export type CompoundEntity = Entity & {
  blocks: Map<string, Block>; // key: "gx,gy"
  coreBlock: string;          // key of the designated core block
                              // (player only — the ship's heart)
};
```

### Updated Player Type

```ts
export type Player = CompoundEntity & {
  kind: 'player';
  // Derived stats (recomputed each frame from blocks):
  thrustForce: number;       // sum of engine contributions
  maxSpeed: number;          // derived from engine count
  shieldActive: boolean;     // true if any shield block has charge > 0
};
```

Player stats are **derived** from the block layout, not stored as raw values. A system function `derivePlayerStats(player: Player): DerivedStats` recomputes these each frame (or on block change).

### Asteroid Type

```ts
export type Asteroid = CompoundEntity & {
  kind: 'asteroid';
  // No extra fields needed. All behaviour comes from blocks and physics.
};
```

All asteroid blocks are of kind `'hull'` with rock-specific health values. Asteroids have no coreBlock requirement — when fragmented, the largest fragment (by block count) inherits the entity id; others get new ids.

### Floating Module Type

```ts
export type FloatingModule = Entity & {
  kind: 'floatingModule';
  block: Block;   // the single block being drifted
  // Entity.size is always { x: 16, y: 16 }
};
```

Floating modules are **not** compound entities — they are single-block entities, similar to particles. They have a velocity (slow drift, randomised direction on spawn), and a lifespan (they disappear after ~60 seconds if not collected).

### Updated Union

```ts
export type GameEntity =
  | Player
  | Asteroid
  | Enemy
  | Projectile
  | Particle
  | FloatingModule;
```

### Projectile & Particle

These remain as simple (non-compound) entities. A projectile still has `ownerId: string` to avoid self-damage. No changes needed to their types.

---

## 4. Module Types

Each block kind has distinct HP, visual appearance, and in the case of the player ship, a gameplay function. Asteroids only ever contain `hull` blocks with a rock visual variant.

### Hull

- **Purpose:** Structural filler. No active ability.
- **HP:** 30
- **Visual:** Dark grey square, slight texture variation per block to break up uniformity.
- **Role in ship:** Provides mass and connectivity. Sacrificial armour — place it to protect functional modules.
- **Notes:** The cheapest and most plentiful collectible, since every asteroid drops hull blocks on destruction.

### Engine

- **Purpose:** Provides forward thrust.
- **HP:** 25 (fragile — engines are priority targets)
- **Visual:** Bright thruster nozzle on the bottom face (facing away from forward direction). Emits particle exhaust when firing.
- **Stat contribution (per engine block):**
  - `+150 px/s²` thrust force
  - `+80 px/s` maximum speed cap
- **Multiple engines:** Effects stack linearly. Two engines = 300 px/s² thrust, 160 px/s max speed above the base. There is a soft cap — beyond ~4 engines the returns diminish (implement as: effective thrust = sum × (1 - 0.05 × max(0, n-4))).
- **Destroyed engine:** The ship immediately recomputes stats. If the last engine is destroyed, the player can still rotate but cannot thrust.
- **Orientation:** An engine block has a `facing` direction (up/down/left/right relative to the local grid). Only the facing matters — a "forward" engine faces toward the ship's nose.

### Laser

- **Purpose:** Fires projectiles.
- **HP:** 20 (the most fragile module)
- **Visual:** A small barrel protrudes from the block's facing face. A subtle glow on the muzzle.
- **Behaviour:**
  - Fires from its world-space muzzle position in the direction of its facing.
  - Fire rate: 2 shots/second per laser block.
  - Multiple laser blocks fire independently on the same input trigger.
  - Lasers on a multi-laser ship that face different directions can create interesting spread patterns — this is a design affordance, not a bug.
- **Orientation:** Like engines, each laser block has a `facing` field.
- **Projectile:** Spawns a standard `Projectile` entity with `ownerId` set to the player's id.

### Shield

- **Purpose:** Absorbs incoming damage before hull blocks are hit.
- **HP:** 40 (as a physical block — can be destroyed like any other)
- **Visual:** Faint hexagonal glow extending slightly beyond the block boundary when charged. Goes dark when depleted.
- **Charge mechanics:**
  - `shieldCharge` ranges from 0 to 1.
  - Each point of incoming damage is first checked: is the hit block adjacent to a shield block with charge > 0? If yes, the damage is redirected to the shield's charge instead.
  - Charge depletion: each 1 point of absorbed damage depletes `shieldCharge` by `1 / maxAbsorb` where `maxAbsorb` is a per-block constant (e.g. 50).
  - Recharge rate: `+0.15 / second` when not absorbing damage, starting after a 2-second cooldown since last hit.
  - Multiple shield blocks each maintain their own charge and protect their adjacent neighbours.
- **Placement note:** A shield block only protects blocks adjacent to it (orthogonally). Shields on the ship's exposed edges are effective; shields buried in the interior are wasted.
- **When destroyed:** The block is gone. No lingering effect.

### Thruster (Lateral)

- **Purpose:** Provides lateral (strafing) thrust in addition to forward thrust.
- **HP:** 25
- **Visual:** Smaller nozzle than the engine, faces perpendicular to the ship's axis.
- **Stat contribution:** Adds a lateral thrust force (default `+100 px/s²` per block) in the direction the thruster faces.
- **Controls:** Lateral input is a separate axis from the existing `steer` / `thrust` inputs. On mobile, a second joystick thumb zone, or the existing joystick's horizontal axis could drive it.
- **Notes:** Without any thruster blocks, the ship cannot strafe — it must rotate to change direction. Thruster blocks fundamentally change the movement style and are a meaningful upgrade.

### Repair

- **Purpose:** Slowly restores HP to adjacent damaged blocks.
- **HP:** 30
- **Visual:** A subtle pulsing cross symbol on the block face.
- **Behaviour:**
  - Every 5 seconds, the repair block ticks: each orthogonally adjacent block with HP < maxHP gains `+5 HP` (capped at maxHP).
  - The repair block itself can be repaired by another adjacent repair block.
  - The `repairCooldown` field tracks time until next tick.
- **Placement note:** Most useful near important functional modules (engines, lasers). Stacking repair blocks next to each other provides a modest benefit but doesn't scale as well as placing them near fragile targets.

### Collector

- **Purpose:** Increases the magnetic pull range for floating modules.
- **HP:** 30
- **Visual:** A magnet icon or concentric ring motif. A subtle pull-effect particle bloom when a floating module is within range.
- **Behaviour:**
  - Each collector block adds `+60 px` to the collection radius.
  - Base collection radius without any collector: `80 px`.
  - Modules within the collection radius drift toward the player at `+120 px/s` (in addition to their existing velocity).
  - The attraction force scales by `1 / distance²` clamped to a minimum distance.
- **Notes:** Collector blocks are primarily a quality-of-life upgrade. Early game, the player must fly directly over drops. Later, a collector block makes post-combat salvage much faster.

### Module Summary Table

| Kind      | HP | Destroyable? | Active Ability                         | Stack Effect       |
|-----------|----|--------------|----------------------------------------|--------------------|
| Hull      | 30 | Yes          | None                                   | None               |
| Engine    | 25 | Yes          | Forward thrust                         | Linear (soft cap)  |
| Laser     | 20 | Yes          | Fires projectile from facing           | Independent        |
| Shield    | 40 | Yes          | Absorbs damage to adjacent blocks      | Each covers own area |
| Thruster  | 25 | Yes          | Lateral thrust                         | Linear             |
| Repair    | 30 | Yes          | Heals adjacent blocks on cooldown      | Cumulative area    |
| Collector | 30 | Yes          | Expands floating module pickup radius  | Linear             |

---

## 5. Damage & Fragmentation

### Hit Resolution

1. A `Projectile` entity moves through space. Each frame, its new position is tested against all compound entities using broad-phase AABB.
2. If the broad-phase hits, the narrow-phase iterates over the compound entity's blocks and computes each block's world-space AABB.
3. The first block whose AABB contains the projectile's new position is the **hit block**.
4. The projectile is consumed (removed from `entities`).
5. The hit block's `health` is reduced by the projectile's damage value.
6. **Shield intercept check:** Before applying damage to the block, check if any adjacent block is a `shield` block with `shieldCharge > 0`. If so, route damage to the shield's charge instead. If the shield's charge reaches 0 and damage remains, apply the remainder to the hit block.
7. If `health <= 0`, the block is destroyed (see Destruction below).

Collisions between a compound entity and another compound entity (e.g., asteroid ramming the player) resolve similarly: find the pair of blocks in closest proximity, apply collision damage to both.

### Block Destruction

When a block's HP reaches 0:

1. Remove the block from the compound entity's `blocks` map.
2. Spawn a `FloatingModule` entity at the block's world position with a randomised ejection velocity (magnitude ~80–200 px/s in a cone away from the impact direction).
3. Run the **connectivity check** on the remaining blocks.
4. Apply any **derived stat recomputation** for the player (e.g., if the destroyed block was an engine, recalculate `thrustForce`).

### Connectivity Check

The connectivity check determines whether the cluster has fractured into disconnected sub-clusters.

```ts
function findConnectedComponents(blocks: Map<string, Block>): Map<string, Block>[] {
  const visited = new Set<string>();
  const components: Map<string, Block>[] = [];

  for (const key of blocks.keys()) {
    if (visited.has(key)) continue;

    // BFS from this block
    const component = new Map<string, Block>();
    const queue = [key];
    while (queue.length > 0) {
      const k = queue.shift()!;
      if (visited.has(k)) continue;
      visited.add(k);
      component.set(k, blocks.get(k)!);

      const [gx, gy] = k.split(',').map(Number);
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nk = blockKey(gx + dx, gy + dy);
        if (blocks.has(nk) && !visited.has(nk)) {
          queue.push(nk);
        }
      }
    }
    components.push(component);
  }

  return components; // length > 1 means fragmentation occurred
}
```

### Fragmentation Outcomes

**If the compound entity has 0 blocks remaining:** Remove the entity entirely. Nothing spawns (floatingModules were already spawned per block at destruction time).

**If 1 component:** No split. Update the entity in place (block already removed).

**If 2+ components:** The cluster has fragmented.

For **asteroids:**
- Remove the original asteroid entity.
- For each component with >1 block: spawn a new `Asteroid` entity. Compute a new `position` as the centroid of the component's blocks, and a new `coreBlock` key (arbitrary — asteroids don't have a designated core).
- For each component with exactly 1 block: the block's `FloatingModule` was already spawned. No new asteroid entity needed.
- Award score proportional to blocks destroyed.

For **the player:**
- Identify which component contains the `coreBlock` key. This becomes the new player entity.
- Remaining components become floating wreckage: spawn an `Asteroid` entity (or a new `Wreckage` kind if we want to distinguish them) for each, with zero velocity or slight drift. These can be re-collected.
- If the coreBlock was the block that was destroyed, it is game over.

### One-Block Asteroid Edge Case

A single-block asteroid hit by a projectile simply removes the entity and spawns a `FloatingModule`. No connectivity check needed (trivially connected). Worth noting as a special case in the collision system to skip BFS.

### Collision Damage Values

| Source                      | Damage per hit |
|-----------------------------|----------------|
| Player laser projectile     | 10             |
| Asteroid collision (per block pair) | 15    |
| Player–asteroid block collision | 20        |

These are initial tuning values — expose as constants in a `constants.ts` file, not magic numbers.

---

## 6. Collection & Ship Building

### Floating Modules

When a block is destroyed, a `FloatingModule` entity spawns:

```ts
const floatingModule: FloatingModule = {
  id: generateId(),
  kind: 'floatingModule',
  position: worldPositionOfDestroyedBlock,
  velocity: ejectVelocity,   // ~80–200 px/s, randomised cone away from impact
  size: { x: 16, y: 16 },
  rotation: Math.random() * Math.PI * 2,  // arbitrary, purely visual
  active: true,
  block: { ...destroyedBlock, health: destroyedBlock.maxHealth * 0.5 },
  // Collected modules start at 50% HP — they took damage to be dislodged
};
```

Floating modules:
- Drift slowly and decelerate via a mild drag (e.g. `DRAG = 0.98` per second).
- Have a `lifespan` of 60 seconds. After expiry they fade out and are removed.
- Are drawn as their block type at small scale with a faint glow to distinguish them from debris particles.

### Collection

Every frame, the movement system (or a dedicated `collectionSystem`) checks:

1. Compute `collectionRadius` from player derived stats (base 80 + 60 per collector block).
2. For each `FloatingModule` entity, compute distance to the player's world-space centroid.
3. If distance < `collectionRadius`, apply a pull force toward the player's position:
   - `pullAcceleration = 120 * (1 / max(distance, 8)) px/s²`
4. If distance < 12 px (contact threshold), collect the module: remove the `FloatingModule` entity, add the `block` to `player.collectedModules` (a staging array, not yet placed on the ship).

### Collected Modules Inventory

The player has an inventory of collected but unplaced blocks:

```ts
export type Player = CompoundEntity & {
  kind: 'player';
  collectedModules: Block[];  // staging area — not yet on the ship
  // ...derived stats
};
```

The inventory has no hard cap initially; add one (e.g. 20 blocks) if inventory management becomes part of the design.

### Ship Editor

The ship editor is a modal overlay accessed from a pause menu (or a dedicated interstitial between wave phases).

**Layout:**
- The ship's current block grid is displayed at 2× scale (32 px per cell) in the center of the screen.
- The collected modules inventory is displayed in a scrollable row at the bottom.
- The player drags a module from the inventory onto the ship grid.

**Placement rules:**
1. A block can only be placed in a cell adjacent (orthogonally) to an existing block.
2. A block can only be placed in an empty cell.
3. There is no shape restriction beyond connectivity — L-shapes, T-shapes, lines, all valid.
4. Engine and laser blocks have a `facing` that defaults to the standard "forward" direction but can be rotated before placement with a tap-to-rotate gesture.

**Removal:**
- The player can tap any non-core block on the ship to remove it. The block returns to the inventory.
- A removal is only allowed if it would not disconnect the remaining ship (i.e., removing the block keeps the ship as a single connected component). Show a shake/red flash if the removal would disconnect the ship.

**Validation:**
- The core block cannot be removed.
- Removing a block that would disconnect the ship is disallowed — the editor should preview this with a greyed-out tap state.

**State:**
- Ship editor reads and writes to the player entity's `blocks` map directly.
- The editor does not run during active gameplay — it is a separate phase (`'editing'` added to `GamePhase`).

### Starting Ship Layout

The player begins with a minimal but functional ship:

```
  [ L ]       (Laser, facing up)
  [ H ]       (Hull — core block)
  [ E ]       (Engine, facing down)
```

Grid coordinates (gx, gy) with gy increasing downward:
- Laser: `{gx: 0, gy: -1}`, facing `'up'`
- Hull (core): `{gx: 0, gy: 0}`
- Engine: `{gx: 0, gy: 1}`, facing `'down'`

This gives the player 3 blocks total. Everything else must be collected and built.

---

## 7. UI/UX Notes

### Game Canvas

The game is rendered entirely on a single `<Canvas>` via `@shopify/react-native-skia`. Each compound entity's blocks are drawn in a loop: transform to entity world position + rotation, then draw each block as a filled rect with a border. Block colours by type:

| Block kind | Fill colour    | Border colour |
|------------|----------------|---------------|
| Hull       | `#2a2a2a`      | `#444444`     |
| Engine     | `#1a3a5c`      | `#2266aa`     |
| Laser      | `#3a1a1a`      | `#aa2222`     |
| Shield     | `#1a2a3a`      | `#2288cc`     |
| Thruster   | `#1a3a3a`      | `#22aaaa`     |
| Repair     | `#1a3a1a`      | `#22aa44`     |
| Collector  | `#2a1a3a`      | `#8822cc`     |
| Rock       | `#3a3530`      | `#5a5048`     |

Shield blocks with active charge render an additional semi-transparent glow layer (`rgba(34, 136, 204, 0.3)`) slightly larger than the block.

### HUD

Keep the HUD minimal. No health bar (the ship's visual state is the health indicator). Consider:
- **Score** (top right, small)
- **Collected inventory count** (bottom right, small)
- **Engine thrust indicator** — a subtle exhaust glow proportional to thrust input (this comes from the existing particle emitter, extended)

### Controls

Controls remain as currently designed: a virtual joystick for rotate/thrust. When thruster blocks exist on the ship, the joystick's horizontal axis should also drive lateral thrust (or a second gesture zone). This is a tuning decision — document it as unresolved (see Open Questions).

### Ship Editor UI

The editor overlay should feel like arranging actual hardware, not clicking a menu. Priorities:
- Large touch targets (32 px per cell at 2× scale = 64 px effective touch area — acceptable)
- Visual preview of facing direction on engine/laser blocks (small arrow on the block face)
- Snap-to-grid with haptic feedback on placement
- The ship rotates to "nose up" orientation in the editor regardless of in-game rotation
- A "fly" button exits the editor and resumes gameplay

### Asteroids Visual

Asteroids should look irregular despite being block-based. Achieve this by:
- Generating asteroid shapes with rough edges (avoid pure rectangles — use irregular BFS growth seeded from a center block)
- Adding slight per-block colour variation within the rock palette
- Adding a very subtle rotation to drifting asteroids (constant `rotationVelocity` on the entity, e.g. 0.3–0.8 rad/s)

### Death Screen

When the player's core block is destroyed, transition to `gameover` phase. Display:
- "HULL BREACH" in large, cold type
- Final score
- Ship silhouette of the ship at time of death (render the last known block layout, greyed out)
- Restart button

---

## 8. Open Questions

These are design decisions not yet resolved. Each should be resolved before implementation of the relevant system.

### Q1: Wave structure vs. open world

**Question:** Is the game structured as discrete waves/levels with editor breaks between them, or is it an endless open-world asteroid field?

**Option A (Waves):** Cleaner difficulty progression. Natural edit breaks. Less emergent. More predictable.

**Option B (Endless field):** The player edits during a pause mid-flight. More tense but harder to balance.

**Recommendation:** Start with waves for the prototype. Add open-world as a mode later.

### Q2: Camera

**Question:** Does the camera follow the player (scrolling world) or does the player stay centered in a fixed world?

**Current implementation** uses a centered-player approach implicitly (player position is drawn at screen center based on `usePlayerPhysics`). This needs clarifying for asteroid spawn/despawn logic.

**Recommendation:** Player is centered. Asteroids exist in a world coordinate system. Spawn asteroids at a fixed world-space distance from the player. Cull asteroids that are beyond a max distance threshold.

### Q3: Lateral thrust controls

**Question:** With thruster blocks installed, how does the player control lateral thrust on mobile? Options:
- (A) Separate second joystick
- (B) Existing joystick horizontal axis (which currently steers) switches to strafe mode
- (C) Hold a dedicated button to toggle between rotate-mode and strafe-mode

**Recommendation:** Option C is clearest for mobile. Default joystick = rotate + thrust. A "strafe" toggle button activates lateral thrust mode. This avoids a second joystick cluttering the screen.

### Q4: Player ship fragmentation

**Question:** If the player ship splits, is that an instant game-over, or does the player continue with the core-containing fragment?

**Recommendation:** Continue with the core fragment. The other fragments become floating wreckage and can be collected and re-attached. This is a more interesting outcome than instant death and rewards good play (re-assembling your broken ship mid-run).

### Q5: Enemy ships

**Question:** Enemies are currently a stub (`kind: 'enemy'`). Are enemies also compound entities with typed modules?

**Recommendation:** Yes — enemies should eventually be compound entities. An enemy with an engine module is faster; destroying its engine slows it. This creates interesting decisions (disable vs. destroy). However, enemy compound entities are scope-heavy. For the initial prototype, keep enemies as simple entities. Upgrade them in a second pass.

### Q6: Asteroid spawning

**Question:** How are asteroid shapes generated procedurally? What are the size constraints?

**Proposal:**
- Small asteroid: 2–5 blocks (spawned frequently, low reward)
- Medium asteroid: 6–15 blocks (moderate frequency, moderate reward)
- Large asteroid: 16–35 blocks (rare, high reward and risk)
- Shape generation: iterative BFS growth from a seed block, each step adding a random adjacent cell with probability `p` that decreases slightly with distance from the center. This produces irregular, roughly-convex blob shapes.

### Q7: Scoring

**Question:** What drives score? Options: blocks destroyed, asteroids fully cleared, time survived, distance travelled, modules collected.

**Proposal:** Primarily blocks destroyed and asteroids fully cleared. Bonus for clearing an asteroid in a single burst (no fragments escape). Multiplier for surviving longer without taking damage.

### Q8: Repair block balance

**Question:** Is a 5 HP / 5 second repair rate fast enough to matter but slow enough to not be overpowered?

**Note:** At 5 HP/5 sec = 1 HP/sec, a hull block (30 HP) takes 30 seconds to fully heal. A laser block (20 HP) takes 20 seconds. In a firefight this is mostly irrelevant — repair is meaningful in the calm between waves. This seems appropriate. Revisit during balance testing.

### Q9: Core block visual identity

**Question:** How does the player know which block is the core? It is not a functional module type — it is a special property of a hull block.

**Proposal:** The core block has a distinct visual marker: a faint crosshair or dot in the center, in a contrast colour (e.g. `#ffffff22` on top of the hull fill). It is subtle enough not to be distracting but visible when the player looks for it.

### Q10: Floating module lifespan and world cleanup

**Question:** 60 seconds is a long lifespan for floating modules. In a fast-paced run, this could accumulate many entities.

**Options:** (A) Reduce lifespan to 20 seconds. (B) Cap total floating modules globally (remove oldest when cap is hit). (C) Modules only spawn from the player's own destroyed blocks, not asteroid fragments (reduces volume dramatically).

**Recommendation:** Start with option A (20 seconds) and increase if playtest feedback suggests modules are hard to collect. Also implement option B (cap at 30 floating modules) as a safety net.

---

*End of document. Update this file as design decisions are resolved. Mark resolved questions with a ✓ and the implementation date.*
