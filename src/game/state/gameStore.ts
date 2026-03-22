import { create } from 'zustand';
import { Enemy, GameEntity, Player } from '../entities/types';
import { createPlayer } from '../entities/player';

export type GamePhase = 'idle' | 'intro' | 'starring' | 'playing' | 'paused' | 'gameover';

type GameState = {
  phase: GamePhase;
  score: number;
  entities: Map<string, GameEntity>;

  // Actions
  beginIntro: () => void;
  endIntro: () => void;
  startGame: (screenWidth: number, screenHeight: number) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  resetGame: () => void;

  upsertEntity: (entity: GameEntity) => void;
  removeEntity: (id: string) => void;
  addScore: (points: number) => void;
  getPlayer: () => Player | undefined;
};

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'idle',
  score: 0,
  entities: new Map(),

  beginIntro: () => set({ phase: 'intro' }),
  endIntro: () => set({ phase: 'starring' }),

  startGame: (screenWidth, screenHeight) => {
    const player = createPlayer(0, 0);
    const marker: Enemy = {
      id: 'marker',
      kind: 'enemy',
      position: { x: 0, y: -300 },
      velocity: { x: 0, y: 0 },
      size: { x: 28, y: 28 },
      rotation: 0,
      active: true,
      health: 999,
    };
    set({
      phase: 'playing',
      score: 0,
      entities: new Map([[player.id, player], [marker.id, marker]]),
    });
  },

  pauseGame: () =>
    set((s) => s.phase === 'playing' ? { phase: 'paused' } : s),

  resumeGame: () =>
    set((s) => s.phase === 'paused' ? { phase: 'playing' } : s),

  endGame: () => set({ phase: 'gameover' }),

  resetGame: () => set({ phase: 'idle', score: 0, entities: new Map() }),

  upsertEntity: (entity) =>
    set((s) => {
      const next = new Map(s.entities);
      next.set(entity.id, entity);
      return { entities: next };
    }),

  removeEntity: (id) =>
    set((s) => {
      const next = new Map(s.entities);
      next.delete(id);
      return { entities: next };
    }),

  addScore: (points) => set((s) => ({ score: s.score + points })),

  getPlayer: () => {
    const entity = get().entities.get('player');
    return entity?.kind === 'player' ? entity : undefined;
  },
}));
