# Hullbreak

A 2D mobile game built with React Native + Skia.

## Stack

| Package | Purpose |
|---|---|
| Expo ~53 (managed workflow) | Build tooling, dev server |
| React Native 0.79 / React 19 | App framework |
| @shopify/react-native-skia | 2D canvas rendering |
| react-native-reanimated | Animation bridge / Skia dependency |
| react-native-gesture-handler | Touch input |
| zustand ^5 | Game state management |
| expo-router | Navigation / screen layout |

## Getting Started

```bash
npm install
npx expo install react-native-gesture-handler
npx expo start
```

## Project Structure

```
app/
  _layout.tsx         # Root layout (fullscreen, dark, no header)
  index.tsx           # Game screen

src/
  components/
    GameCanvas.tsx    # Skia canvas + entity renderer
    HUD.tsx           # Score, pause button, idle/gameover overlays
  game/
    entities/
      types.ts        # Entity type definitions
      player.ts       # Player factory
    loop/
      useGameLoop.ts  # Frame loop via Skia useFrameCallback
    state/
      gameStore.ts    # Zustand store
    systems/
      movement.ts     # Velocity → position integration
      collision.ts    # AABB overlap + off-screen checks
  utils/
    math.ts           # vec2 helpers, lerp, clamp, randomRange
```

## Architecture

### Entities

All game objects share a base `Entity` shape with `position`, `velocity`, `size`, `rotation`, and `active`. Specialised kinds extend this:

- `player` — health, single instance with id `"player"`
- `enemy` — health
- `projectile` — ownerId to attribute damage
- `particle` — life (0–1) + decay rate for self-expiry

New entity types: add to the `GameEntity` union in `types.ts`.

### State (Zustand)

A single store holds `phase`, `score`, and `entities: Map<string, GameEntity>`. Systems read from and write to this store each frame via `upsertEntity` / `removeEntity`.

Game phases: `idle → playing ⇄ paused → gameover → idle`

### Game Loop

`useGameLoop` (in `src/game/loop/`) calls Skia's `useFrameCallback`, which runs on the UI thread at display refresh rate — no JS bridge round-trip per frame. Each tick:

1. Iterates all entities
2. Runs movement / particle decay systems
3. Removes off-screen projectiles and dead particles
4. Batch-writes back to the store

### Rendering

`GameCanvas.tsx` reads `entities` from the store and maps each one to a Skia component. Adding a new visual: handle the new entity kind in the `EntityRenderer` switch.

### Systems

Systems in `src/game/systems/` are **pure functions** — they take an entity + context and return a new entity. This keeps them easy to test and compose.

## What to Build Next

- **Input** — drag or touch-to-move player (`Gesture.Pan` in GameCanvas)
- **Spawner** — enemy / obstacle spawner system, called from the game loop
- **Shooting** — fire projectiles from player on tap/interval
- **Collision resolution** — wire `aabbOverlap` into the loop to apply damage / destroy entities
- **Particles** — spawn particles on entity death for feedback
- **Scoring** — call `addScore` when enemies are destroyed
