import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useGameStore } from '@/game/state/gameStore';

export function HUD() {
  const phase = useGameStore((s) => s.phase);
  const score = useGameStore((s) => s.score);
  const pauseGame = useGameStore((s) => s.pauseGame);
  const resumeGame = useGameStore((s) => s.resumeGame);
  const resetGame = useGameStore((s) => s.resetGame);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Score */}
      {phase === 'playing' && (
        <View style={styles.scoreContainer}>
          <Text style={styles.score}>{score}</Text>
          <Pressable onPress={pauseGame} style={styles.pauseBtn}>
            <Text style={styles.pauseLabel}>II</Text>
          </Pressable>
        </View>
      )}

      {/* Overlay screens */}
      {phase === 'idle' && (
        <Overlay>
          <Text style={styles.title}>HULLBREAK</Text>
          <Text style={styles.subtitle}>Tap to start</Text>
        </Overlay>
      )}

      {phase === 'paused' && (
        <Overlay>
          <Text style={styles.title}>PAUSED</Text>
          <Pressable onPress={resumeGame} style={styles.btn}>
            <Text style={styles.btnLabel}>Resume</Text>
          </Pressable>
          <Pressable onPress={resetGame} style={[styles.btn, styles.btnSecondary]}>
            <Text style={styles.btnLabel}>Quit</Text>
          </Pressable>
        </Overlay>
      )}

      {phase === 'gameover' && (
        <Overlay>
          <Text style={styles.title}>GAME OVER</Text>
          <Text style={styles.subtitle}>Score: {score}</Text>
          <Text style={styles.hint}>Tap to play again</Text>
        </Overlay>
      )}
    </View>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scoreContainer: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  score: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 2,
  },
  pauseBtn: {
    padding: 8,
  },
  pauseLabel: {
    color: '#fff',
    fontSize: 20,
    letterSpacing: 2,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 6,
  },
  subtitle: {
    color: '#aaa',
    fontSize: 18,
    letterSpacing: 2,
  },
  hint: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
  btn: {
    backgroundColor: '#4af',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 160,
    alignItems: 'center',
  },
  btnSecondary: {
    backgroundColor: '#333',
  },
  btnLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
