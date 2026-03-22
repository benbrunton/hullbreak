import React, { useEffect, useMemo } from 'react';
import { Canvas, Group, Rect, Circle } from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS, useDerivedValue, useSharedValue, withSequence, withTiming, withDelay } from 'react-native-reanimated';
import { useGameStore } from '@/game/state/gameStore';
import { useGameLoop } from '@/game/loop/useGameLoop';
import { usePlayerPhysics } from '@/game/loop/usePlayerPhysics';
import { inputThrust, inputSteer } from '@/input/inputState';
import { GameEntity } from '@/game/entities/types';

const PARALLAX_FAR  = 0.02;
const PARALLAX_MID  = 0.05;
const PARALLAX_NEAR = 0.09;

type Props = {
  width: number;
  height: number;
};

export function GameCanvas({ width, height }: Props) {
  const entities = useGameStore((s) => s.entities);
  const phase = useGameStore((s) => s.phase);
  const startGame = useGameStore((s) => s.startGame);
  const beginIntro = useGameStore((s) => s.beginIntro);

  useGameLoop({ screenWidth: width, screenHeight: height });

  const { x, y, rotation, camX, camY, active, reset } = usePlayerPhysics(width, height);

  const cameraTransform = useDerivedValue(() => [
    { translateX: camX.value },
    { translateY: camY.value },
  ]);
  const playerTransform = useDerivedValue(() => [
    { translateX: x.value },
    { translateY: y.value },
    { rotate: rotation.value },
  ]);

  const parallaxFar = useDerivedValue(() => [
    { translateX: -x.value * PARALLAX_FAR  },
    { translateY: -y.value * PARALLAX_FAR  },
  ]);
  const parallaxMid = useDerivedValue(() => [
    { translateX: -x.value * PARALLAX_MID  },
    { translateY: -y.value * PARALLAX_MID  },
  ]);
  const parallaxNear = useDerivedValue(() => [
    { translateX: -x.value * PARALLAX_NEAR },
    { translateY: -y.value * PARALLAX_NEAR },
  ]);

  // Activate/reset physics when game starts or stops
  useEffect(() => {
    if (phase === 'playing') {
      reset();
      inputThrust.value = 0;
      inputSteer.value = 0;
    }
    active.value = phase === 'playing';
  }, [phase]);

  // Three star layers — far/mid/near — each fades in after the nav star finishes twinkling
  const bgFade = useSharedValue(0);
  const starsFar  = useMemo(() => Array.from({ length: 35 }, (_, i) => ({ id: i,
    cx: Math.random() * width, cy: Math.random() * height,
    r: 0.4 + Math.random() * 0.6, opacity: 0.12 + Math.random() * 0.25 })), [width, height]);
  const starsMid  = useMemo(() => Array.from({ length: 20 }, (_, i) => ({ id: i,
    cx: Math.random() * width, cy: Math.random() * height,
    r: 0.6 + Math.random() * 0.8, opacity: 0.2  + Math.random() * 0.35 })), [width, height]);
  const starsNear = useMemo(() => Array.from({ length: 10 }, (_, i) => ({ id: i,
    cx: Math.random() * width, cy: Math.random() * height,
    r: 0.9 + Math.random() * 1.0, opacity: 0.3  + Math.random() * 0.45 })), [width, height]);

  // Navigation star (twinkling)
  const starOpacity = useSharedValue(0);
  const starR = useSharedValue(2.5);
  const navStarX = width * 0.68;
  const navStarY = height * 0.22;

  // Nav star + bg stars fire during 'starring'. Auto-start game after sequence completes.
  // Nav star:  500 delay + 3400 animation = 3900ms
  // Bg stars:  3800 delay + 1800 fade    = 5600ms
  const STAR_SEQUENCE_MS = 6000;
  const GAME_FADE_MS = 1200;

  // Fades in the world group when the game starts
  const gameOpacity = useSharedValue(0);
  useEffect(() => {
    if (phase === 'playing') {
      gameOpacity.value = withTiming(1, { duration: GAME_FADE_MS });
    } else if (phase !== 'gameover') {
      gameOpacity.value = 0;
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== 'starring') return;

    // Start the game slightly before star sequence ends so it fades in with the stars
    const gameTimer = setTimeout(() => startGame(width, height), STAR_SEQUENCE_MS - GAME_FADE_MS);

    starOpacity.value = withDelay(
      500,
      withSequence(
        withTiming(1, { duration: 600 }),
        withTiming(0.4, { duration: 800 }),
        withTiming(0.9, { duration: 400 }),
        withTiming(0.2, { duration: 700 }),
        withTiming(0.85, { duration: 900 }),
      ),
    );
    starR.value = withDelay(
      500,
      withSequence(
        withTiming(4, { duration: 600 }),
        withTiming(2, { duration: 800 }),
        withTiming(5, { duration: 400 }),
        withTiming(2.5, { duration: 700 }),
        withTiming(3, { duration: 900 }),
      ),
    );
    // Nav star finishes at ~3900ms — fade bg stars in from there
    bgFade.value = withDelay(3800, withTiming(1, { duration: 1800 }));

    return () => clearTimeout(gameTimer);
  }, [phase]);

  const handleTap = () => {
    if (phase === 'idle') {
      beginIntro();
    } else if (phase === 'gameover') {
      startGame(width, height);
    }
  };

  const tap = Gesture.Tap().runOnJS(true).onEnd(handleTap);

  return (
    <GestureDetector gesture={tap}>
      <Canvas style={{ width, height }}>
        <Rect x={0} y={0} width={width} height={height} color="#0a0a0f" />

        {/* Navigation star — appears first, triggers the bg fade-in */}
        <Group transform={parallaxMid}>
          <Circle cx={navStarX} cy={navStarY} r={starR} color="#e8f4ff" opacity={starOpacity} />
        </Group>

        {/* Background star layers — fade in once nav star settles */}
        <Group transform={parallaxFar} opacity={bgFade}>
          {starsFar.map((s) => (
            <Circle key={s.id} cx={s.cx} cy={s.cy} r={s.r} color="#ddeeff" opacity={s.opacity} />
          ))}
        </Group>
        <Group transform={parallaxMid} opacity={bgFade}>
          {starsMid.map((s) => (
            <Circle key={s.id} cx={s.cx} cy={s.cy} r={s.r} color="#e8f4ff" opacity={s.opacity} />
          ))}
        </Group>
        <Group transform={parallaxNear} opacity={bgFade}>
          {starsNear.map((s) => (
            <Circle key={s.id} cx={s.cx} cy={s.cy} r={s.r} color="#ffffff" opacity={s.opacity} />
          ))}
        </Group>

        {/* World space — only visible during active gameplay */}
        {(phase === 'playing' || phase === 'gameover') && (
          <Group transform={cameraTransform} opacity={gameOpacity}>
            <Group transform={playerTransform}>
              <Rect x={-16} y={-16} width={32} height={32} color="#4af" />
            </Group>
            {Array.from(entities.values())
              .filter((e) => e.kind !== 'player')
              .map((entity) => (
                <EntityRenderer key={entity.id} entity={entity} />
              ))}
          </Group>
        )}
      </Canvas>
    </GestureDetector>
  );
}

function EntityRenderer({ entity }: { entity: GameEntity }) {
  const { position, size, rotation } = entity;
  const cx = position.x;
  const cy = position.y;
  const hw = size.x / 2;
  const hh = size.y / 2;

  switch (entity.kind) {
    case 'player':
      return null;

    case 'enemy':
      return (
        <Group transform={[{ translateX: cx }, { translateY: cy }, { rotate: rotation }]}>
          <Rect x={-hw} y={-hh} width={size.x} height={size.y} color="#f44" />
        </Group>
      );

    case 'projectile':
      return <Circle cx={cx} cy={cy} r={4} color="#ff0" />;

    case 'particle':
      return (
        <Circle
          cx={cx}
          cy={cy}
          r={3 * entity.life}
          color={entity.color}
          opacity={entity.life}
        />
      );
  }
}
