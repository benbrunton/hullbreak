import { makeMutable } from 'react-native-reanimated';

// Shared values so gesture callbacks (UI thread) can write
// and the frame callback (UI thread) can read — no runOnJS needed.
export const inputThrust = makeMutable(0); // 0–1
export const inputSteer = makeMutable(0);  // -1–1
