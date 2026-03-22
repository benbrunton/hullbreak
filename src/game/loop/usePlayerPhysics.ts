import { useSharedValue, useDerivedValue, useFrameCallback } from 'react-native-reanimated';
import { inputThrust, inputSteer } from '@/input/inputState';

const ROTATE_SPEED = 2.5; // rad/s
const THRUST_FORCE = 200; // px/s²
const DRAG = 0.7;         // fraction of velocity retained per second

export function usePlayerPhysics(screenWidth: number, screenHeight: number) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const rotation = useSharedValue(0);
  const vx = useSharedValue(0);
  const vy = useSharedValue(0);
  const active = useSharedValue(false);

  const camX = useDerivedValue(() => screenWidth / 2 - x.value);
  const camY = useDerivedValue(() => screenHeight / 2 - y.value);

  useFrameCallback((info) => {
    if (!active.value) return;
    const delta = Math.min((info.timeSincePreviousFrame ?? 16) / 1000, 0.05);

    const r = rotation.value + inputSteer.value * ROTATE_SPEED * delta;
    rotation.value = r;

    const drag = DRAG ** delta;
    const newVX = (vx.value + Math.sin(r) * inputThrust.value * THRUST_FORCE * delta) * drag;
    const newVY = (vy.value - Math.cos(r) * inputThrust.value * THRUST_FORCE * delta) * drag;
    vx.value = newVX;
    vy.value = newVY;

    x.value += newVX * delta;
    y.value += newVY * delta;
  });

  const reset = () => {
    x.value = 0;
    y.value = 0;
    rotation.value = 0;
    vx.value = 0;
    vy.value = 0;
  };

  return { x, y, rotation, camX, camY, active, reset };
}
