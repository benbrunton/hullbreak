import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
} from 'react-native-reanimated';

const FADE_IN = 1800;
const HOLD = 2200;
const FADE_OUT = 1500;
const TOTAL = FADE_IN + HOLD + FADE_OUT;

type Props = {
  onComplete: () => void;
};

export function IntroScreen({ onComplete }: Props) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: FADE_IN }),
      withDelay(HOLD, withTiming(0, { duration: FADE_OUT })),
    );

    const timer = setTimeout(onComplete, TOTAL);
    return () => clearTimeout(timer);
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, style]}>
      <Animated.Text style={styles.quote}>
        All I ask is a tall ship{'\n'}and a star to steer her by...
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quote: {
    color: '#ccc',
    fontSize: 20,
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 32,
    paddingHorizontal: 40,
  },
});
