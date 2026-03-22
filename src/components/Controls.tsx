import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { inputThrust, inputSteer } from '@/input/inputState';

const STEER_W = 160;
const STEER_H = 72;
const THRUST_W = 72;
const THRUST_H = 180;
const THUMB_W = 32;

export function Controls() {
  const steerPos = useSharedValue(STEER_W / 2);
  const thrustLevel = useSharedValue(0);

  const steerGesture = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      'worklet';
      const clamped = Math.max(0, Math.min(STEER_W, e.x));
      steerPos.value = clamped;
      inputSteer.value = (clamped / STEER_W) * 2 - 1;
    })
    .onUpdate((e) => {
      'worklet';
      const clamped = Math.max(0, Math.min(STEER_W, e.x));
      steerPos.value = clamped;
      inputSteer.value = (clamped / STEER_W) * 2 - 1;
    })
    .onFinalize(() => {
      'worklet';
      steerPos.value = STEER_W / 2;
      inputSteer.value = 0;
    });

  const thrustGesture = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      'worklet';
      const level = Math.max(0, Math.min(1, 1 - e.y / THRUST_H));
      thrustLevel.value = level;
      inputThrust.value = level;
    })
    .onUpdate((e) => {
      'worklet';
      const level = Math.max(0, Math.min(1, 1 - e.y / THRUST_H));
      thrustLevel.value = level;
      inputThrust.value = level;
    })
    .onFinalize(() => {
      'worklet';
      thrustLevel.value = 0;
      inputThrust.value = 0;
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: steerPos.value - THUMB_W / 2 }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    height: thrustLevel.value * (THRUST_H - 16),
    opacity: 0.3 + thrustLevel.value * 0.7,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <GestureDetector gesture={steerGesture}>
        <View style={styles.steer}>
          <View style={styles.steerTrack} />
          <Animated.View style={[styles.steerThumb, thumbStyle]} />
          <View style={styles.steerLabels}>
            <Text style={styles.label}>◄</Text>
            <Text style={styles.label}>►</Text>
          </View>
        </View>
      </GestureDetector>

      <GestureDetector gesture={thrustGesture}>
        <View style={styles.thrust}>
          <Animated.View style={[styles.thrustFill, fillStyle]} />
          <Text style={[styles.label, styles.thrustLabel]}>▲</Text>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  steer: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    width: STEER_W,
    height: STEER_H,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  steerTrack: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 1,
  },
  steerThumb: {
    position: 'absolute',
    width: THUMB_W,
    height: THUMB_W,
    borderRadius: THUMB_W / 2,
    backgroundColor: 'rgba(100,200,255,0.6)',
    top: (STEER_H - THUMB_W) / 2,
  },
  steerLabels: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  thrust: {
    position: 'absolute',
    bottom: 40,
    right: 24,
    width: THRUST_W,
    height: THRUST_H,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    overflow: 'hidden',
  },
  thrustFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(100,200,255,0.5)',
    borderRadius: 16,
  },
  thrustLabel: {
    zIndex: 1,
  },
  label: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },
});
