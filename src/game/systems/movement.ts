import { GameEntity } from '../entities/types';

/** Apply velocity to position for a single entity, clamping to screen bounds. */
export function applyMovement(
  entity: GameEntity,
  delta: number,
  screenWidth: number,
  screenHeight: number,
): GameEntity {
  const hw = entity.size.x / 2;
  const hh = entity.size.y / 2;

  const x = Math.max(hw, Math.min(screenWidth - hw,
    entity.position.x + entity.velocity.x * delta));
  const y = Math.max(hh, Math.min(screenHeight - hh,
    entity.position.y + entity.velocity.y * delta));

  return { ...entity, position: { x, y } };
}

/** Move a projectile straight — no bounds clamping, caller removes off-screen. */
export function applyProjectileMovement(
  entity: GameEntity,
  delta: number,
): GameEntity {
  return {
    ...entity,
    position: {
      x: entity.position.x + entity.velocity.x * delta,
      y: entity.position.y + entity.velocity.y * delta,
    },
  };
}
