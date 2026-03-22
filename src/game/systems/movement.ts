import { input } from '../../input/inputState';
import { GameEntity, Player } from '../entities/types';

const ROTATE_SPEED = 2.5;  // radians per second
const THRUST_FORCE = 400;  // px/s²
const DRAG = 0.5;          // velocity retained after 1 second

export function applyPlayerMovement(entity: Player, delta: number): Player {
  const rotation = entity.rotation + input.steer * ROTATE_SPEED * delta;

  const thrustX = Math.sin(rotation) * input.thrust * THRUST_FORCE * delta;
  const thrustY = -Math.cos(rotation) * input.thrust * THRUST_FORCE * delta;

  const drag = Math.pow(DRAG, delta);
  const vx = (entity.velocity.x + thrustX) * drag;
  const vy = (entity.velocity.y + thrustY) * drag;

  return {
    ...entity,
    rotation,
    velocity: { x: vx, y: vy },
    position: { x: entity.position.x + vx * delta, y: entity.position.y + vy * delta },
  };
}

export function applyMovement(entity: GameEntity, delta: number): GameEntity {
  return {
    ...entity,
    position: {
      x: entity.position.x + entity.velocity.x * delta,
      y: entity.position.y + entity.velocity.y * delta,
    },
  };
}

export function applyProjectileMovement(entity: GameEntity, delta: number): GameEntity {
  return {
    ...entity,
    position: {
      x: entity.position.x + entity.velocity.x * delta,
      y: entity.position.y + entity.velocity.y * delta,
    },
  };
}
