export type Vec2 = {
  x: number;
  y: number;
};

export type Entity = {
  id: string;
  position: Vec2;
  velocity: Vec2;
  size: Vec2;
  rotation: number;
  active: boolean;
};

export type Player = Entity & {
  kind: 'player';
  health: number;
  maxHealth: number;
};

export type Enemy = Entity & {
  kind: 'enemy';
  health: number;
};

export type Projectile = Entity & {
  kind: 'projectile';
  ownerId: string;
};

export type Particle = Entity & {
  kind: 'particle';
  life: number;       // 0-1, dies when 0
  decay: number;      // life lost per second
  color: string;
};

export type GameEntity = Player | Enemy | Projectile | Particle;
