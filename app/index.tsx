import { useWindowDimensions, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GameCanvas } from '@/components/GameCanvas';
import { HUD } from '@/components/HUD';

export default function GameScreen() {
  const { width, height } = useWindowDimensions();

  return (
    <GestureHandlerRootView style={styles.container}>
      <GameCanvas width={width} height={height} />
      <HUD />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
});
