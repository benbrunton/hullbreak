import { useEffect, useRef } from 'react';
import { SharedValue } from 'react-native-reanimated';
import { useGameStore } from '../state/gameStore';
import { inputThrust } from '@/input/inputState';
import { Particle } from '../entities/types';

let particleCounter = 0;

export function useParticleEmitter(
  phase: string,
  playerX: SharedValue<number>,
  playerY: SharedValue<number>,
  playerRotation: SharedValue<number>,
) {
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (phase !== 'playing') return;

    const tick = () => {
      frameRef.current++;

      if (frameRef.current % 2 === 0) {
        const thrust = inputThrust.value;
        if (thrust > 0.05) {
          const r = playerRotation.value;
          const px = playerX.value;
          const py = playerY.value;

          // Emit from the back of the ship
          const backX = -Math.sin(r) * 16;
          const backY =  Math.cos(r) * 16;

          // Spread slightly around the exhaust direction
          const spread = (Math.random() - 0.5) * 0.5;
          const speed = (60 + Math.random() * 50) * thrust;

          const particle: Particle = {
            id: `exhaust_${particleCounter++}`,
            kind: 'particle',
            position: { x: px + backX, y: py + backY },
            velocity: {
              x: -Math.sin(r + spread) * speed,
              y:  Math.cos(r + spread) * speed,
            },
            size: { x: 0, y: 0 },
            rotation: 0,
            active: true,
            life: 0.6 + Math.random() * 0.4,
            decay: 2.8,
            color: '#7be',
          };

          useGameStore.getState().upsertEntity(particle);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);
}
