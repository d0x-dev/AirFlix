import type {WithSpringConfig} from 'react-native-reanimated';

export type M3MotionSpeed = 'fast' | 'default' | 'slow';

const spring = (damping: number, stiffness: number): WithSpringConfig => ({
  damping,
  stiffness,
  mass: 1,
});

export const M3_MOTION = {
  spatial: {
    fast: spring(0.6, 800),
    default: spring(0.8, 380),
    slow: spring(0.8, 200),
  },
  effects: {
    fast: spring(1, 3800),
    default: spring(1, 1600),
    slow: spring(1, 800),
  },
} as const satisfies Record<
  'spatial' | 'effects',
  Record<M3MotionSpeed, WithSpringConfig>
>;
