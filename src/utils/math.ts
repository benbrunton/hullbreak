import { Vec2 } from '@/game/entities/types';

export const vec2 = {
  add: (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y }),
  scale: (v: Vec2, s: number): Vec2 => ({ x: v.x * s, y: v.y * s }),
  length: (v: Vec2): number => Math.sqrt(v.x * v.x + v.y * v.y),
  normalize: (v: Vec2): Vec2 => {
    const len = vec2.length(v);
    return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
  },
  distance: (a: Vec2, b: Vec2): number => vec2.length(vec2.sub(a, b)),
  dot: (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y,
  angle: (v: Vec2): number => Math.atan2(v.y, v.x),
  fromAngle: (angle: number, length = 1): Vec2 => ({
    x: Math.cos(angle) * length,
    y: Math.sin(angle) * length,
  }),
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

export const randomRange = (min: number, max: number): number =>
  min + Math.random() * (max - min);

export const randomInt = (min: number, max: number): number =>
  Math.floor(randomRange(min, max + 1));

export const randomId = (): string =>
  Math.random().toString(36).slice(2, 9);
