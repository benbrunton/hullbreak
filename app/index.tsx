import { useEffect } from 'react';
import { useWindowDimensions, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GameCanvas } from '@/components/GameCanvas';
import { HUD } from '@/components/HUD';
import { IntroScreen } from '@/components/IntroScreen';
import { Controls } from '@/components/Controls';
import { useGameStore } from '@/game/state/gameStore';

const UI_FADE_MS = 800;
const UI_DELAY_MS = 400; // UI fades in slightly after the world

export default function GameScreen() {
  const { width, height } = useWindowDimensions();
  const phase = useGameStore((s) => s.phase);
  const endIntro = useGameStore((s) => s.endIntro);

  const uiOpacity = useSharedValue(0);
  useEffect(() => {
    if (phase === 'playing') {
      uiOpacity.value = withDelay(UI_DELAY_MS, withTiming(1, { duration: UI_FADE_MS }));
    } else if (phase === 'intro' || phase === 'starring') {
      uiOpacity.value = 0;
    } else {
      // idle, paused, gameover — always fully visible
      uiOpacity.value = 1;
    }
  }, [phase]);

  const uiStyle = useAnimatedStyle(() => ({ opacity: uiOpacity.value }));

  return (
    <GestureHandlerRootView style={styles.container}>
      <GameCanvas width={width} height={height} />
      <Animated.View style={[StyleSheet.absoluteFill, uiStyle]} pointerEvents="box-none">
        <HUD />
        {phase === 'playing' && <Controls />}
      </Animated.View>
      {phase === 'intro' && <IntroScreen onComplete={endIntro} />}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
});
