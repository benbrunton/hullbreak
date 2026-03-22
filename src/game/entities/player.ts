import { Player } from './types';

export function createPlayer(x: number, y: number): Player {
  return {
    id: 'player',
    kind: 'player',
    position: { x, y },
    velocity: { x: 0, y: 0 },
    size: { x: 32, y: 32 },
    rotation: 0,
    active: true,
    health: 100,
    maxHealth: 100,
  };
}
