import { useEffect, useRef } from 'react';
import { useGameStore } from '../state/gameStore';
import { applyMovement, applyProjectileMovement } from '../systems/movement';
import { isOffScreen } from '../systems/collision';
import { GameEntity } from '../entities/types';

type GameLoopOptions = {
  screenWidth: number;
  screenHeight: number;
};

export function useGameLoop({ screenWidth, screenHeight }: GameLoopOptions) {
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const tick = (timestamp: number) => {
      const store = useGameStore.getState();

      if (store.phase === 'playing') {
        const delta = lastTimeRef.current
          ? Math.min((timestamp - lastTimeRef.current) / 1000, 0.05)
          : 0;
        lastTimeRef.current = timestamp;

        const toRemove: string[] = [];
        const toUpsert: GameEntity[] = [];

        for (const entity of store.entities.values()) {
          if (!entity.active) {
            toRemove.push(entity.id);
            continue;
          }

          let updated: GameEntity;

          if (entity.kind === 'projectile') {
            updated = applyProjectileMovement(entity, delta);
            if (isOffScreen(updated, screenWidth, screenHeight)) {
              toRemove.push(entity.id);
              continue;
            }
          } else if (entity.kind === 'particle') {
            const life = entity.life - entity.decay * delta;
            if (life <= 0) {
              toRemove.push(entity.id);
              continue;
            }
            updated = applyProjectileMovement({ ...entity, life }, delta);
          } else {
            updated = applyMovement(entity, delta, screenWidth, screenHeight);
          }

          toUpsert.push(updated);
        }

        for (const id of toRemove) store.removeEntity(id);
        for (const entity of toUpsert) store.upsertEntity(entity);
      } else {
        lastTimeRef.current = 0;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [screenWidth, screenHeight]);
}
