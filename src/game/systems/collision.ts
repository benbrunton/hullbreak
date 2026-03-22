import { GameEntity } from '../entities/types';

/** AABB overlap check. */
export function aabbOverlap(a: GameEntity, b: GameEntity): boolean {
  return (
    Math.abs(a.position.x - b.position.x) < (a.size.x + b.size.x) / 2 &&
    Math.abs(a.position.y - b.position.y) < (a.size.y + b.size.y) / 2
  );
}

/** Returns true if the entity is fully outside the screen. */
export function isOffScreen(
  entity: GameEntity,
  screenWidth: number,
  screenHeight: number,
): boolean {
  return (
    entity.position.x + entity.size.x / 2 < 0 ||
    entity.position.x - entity.size.x / 2 > screenWidth ||
    entity.position.y + entity.size.y / 2 < 0 ||
    entity.position.y - entity.size.y / 2 > screenHeight
  );
}
