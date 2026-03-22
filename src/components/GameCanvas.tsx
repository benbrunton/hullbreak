import React from 'react';
import { Canvas, Group, Rect, Circle } from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useGameStore } from '@/game/state/gameStore';
import { useGameLoop } from '@/game/loop/useGameLoop';
import { GameEntity } from '@/game/entities/types';

type Props = {
  width: number;
  height: number;
};

export function GameCanvas({ width, height }: Props) {
  const entities = useGameStore((s) => s.entities);
  const phase = useGameStore((s) => s.phase);
  const startGame = useGameStore((s) => s.startGame);

  useGameLoop({ screenWidth: width, screenHeight: height });

  // Tap to start
  const handleTap = () => {
    if (phase === 'idle' || phase === 'gameover') {
      startGame(width, height);
    }
  };

  const tap = Gesture.Tap().onEnd(runOnJS(handleTap));

  return (
    <GestureDetector gesture={tap}>
      <Canvas style={{ width, height }}>
        {/* Background */}
        <Rect x={0} y={0} width={width} height={height} color="#0a0a0f" />
        {Array.from(entities.values()).map((entity) => (
          <EntityRenderer key={entity.id} entity={entity} />
        ))}
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
      return (
        <Group transform={[{ translateX: cx }, { translateY: cy }, { rotate: rotation }]}>
          <Rect x={-hw} y={-hh} width={size.x} height={size.y} color="#4af" />
        </Group>
      );

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
