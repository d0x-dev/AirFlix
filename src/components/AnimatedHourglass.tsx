import React, {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Circle, ClipPath, Defs, G, Path, Rect} from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type AnimatedHourglassProps = {
  sandColor: string;
  size?: number;
  frameColor?: string;
};

const DURATION = 5200;

export default function AnimatedHourglass({
  sandColor,
  size = 104,
  frameColor = '#ffffff',
}: AnimatedHourglassProps) {
  const cycle = useSharedValue(0);

  useEffect(() => {
    cycle.value = 0;
    cycle.value = withRepeat(
      withSequence(
        withTiming(1, {duration: DURATION, easing: Easing.linear}),
        withTiming(0, {duration: 0}),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(cycle);
    };
  }, [cycle]);

  const turnStyle = useAnimatedStyle(() => {
    const progress = cycle.value;
    const rotation =
      progress < 0.36
        ? 0
        : progress < 0.46
          ? interpolate(progress, [0.36, 0.46], [0, 180])
          : progress < 0.86
            ? 180
            : progress < 0.96
              ? interpolate(progress, [0.86, 0.96], [180, 360])
              : 360;
    return {transform: [{rotate: `${rotation}deg`}]};
  });

  const topAnimatedProps = useAnimatedProps(() => {
    const progress = cycle.value;
    return {
      y:
        progress < 0.02
          ? 21
          : progress < 0.34
            ? interpolate(progress, [0.02, 0.34], [21, 48])
            : progress < 0.46
              ? 48
              : 21,
      height:
        progress < 0.46
          ? 29
          : progress < 0.84
            ? interpolate(progress, [0.46, 0.84], [0, 29])
            : 29,
    };
  });

  const bottomAnimatedProps = useAnimatedProps(() => {
    const progress = cycle.value;
    return {
      y:
        progress < 0.02
          ? 81
          : progress < 0.34
            ? interpolate(progress, [0.02, 0.34], [81, 54])
            : 54,
      height:
        progress < 0.46
          ? 29
          : progress < 0.84
            ? interpolate(progress, [0.46, 0.84], [29, 0])
            : 0,
    };
  });

  const getStreamOpacity = (progress: number) => {
    'worklet';
    if (progress >= 0.02 && progress < 0.04) {
      return interpolate(progress, [0.02, 0.04], [0, 1]);
    }
    if (progress >= 0.04 && progress < 0.32) {
      return 1;
    }
    if (progress >= 0.32 && progress < 0.34) {
      return interpolate(progress, [0.32, 0.34], [1, 0]);
    }
    if (progress >= 0.48 && progress < 0.5) {
      return interpolate(progress, [0.48, 0.5], [0, 1]);
    }
    if (progress >= 0.5 && progress < 0.82) {
      return 1;
    }
    if (progress >= 0.82 && progress < 0.84) {
      return interpolate(progress, [0.82, 0.84], [1, 0]);
    }
    return 0;
  };

  const streamAnimatedProps = useAnimatedProps(() => ({
    opacity: getStreamOpacity(cycle.value),
    strokeDashoffset: -9 * (((cycle.value * DURATION) % 340) / 340),
  }));

  const grainAnimatedProps = useAnimatedProps(() => ({
    opacity: getStreamOpacity(cycle.value),
  }));

  return (
    <View style={{width: size, height: size}} pointerEvents="none">
      <Animated.View
        style={[StyleSheet.absoluteFill, turnStyle]}>
        <Svg width={size} height={size} viewBox="0 0 104 104" fill="none">
        <Defs>
          <ClipPath id="hourglass-top-chamber">
            <Path d="M30 22h44c-1 11-12 19-20 27h-4c-8-8-19-16-20-27Z" />
          </ClipPath>
          <ClipPath id="hourglass-bottom-chamber">
            <Path d="M50 55h4c8 8 19 16 20 27H30c1-11 12-19 20-27Z" />
          </ClipPath>
        </Defs>

        <G clipPath="url(#hourglass-top-chamber)">
          <AnimatedRect
            animatedProps={topAnimatedProps}
            x={29}
            width={46}
            rx={1}
            fill={sandColor}
          />
        </G>
        <G clipPath="url(#hourglass-bottom-chamber)">
          <AnimatedRect
            animatedProps={bottomAnimatedProps}
            x={29}
            width={46}
            rx={1}
            fill={sandColor}
          />
        </G>
        <G
          fill="none"
          stroke={frameColor}
          strokeLinecap="round"
          strokeLinejoin="round">
          <Path d="M22 17h60M22 87h60" strokeWidth={5} />
          <Path
            d="M27 21c0 14 12 21 20 29l2 2-2 2c-8 8-20 15-20 29M77 21c0 14-12 21-20 29l-2 2 2 2c8 8 20 15 20 29"
            strokeWidth={3.2}
          />
        </G>
        </Svg>
      </Animated.View>

      {/* Keep falling sand in screen space so rotating the glass can never
          reverse the stream. Its animation is already hidden during flips. */}
      <Svg
        style={StyleSheet.absoluteFill}
        width={size}
        height={size}
        viewBox="0 0 104 104"
        fill="none">
        <AnimatedPath
          animatedProps={streamAnimatedProps}
          d="M52 48.5v15"
          fill="none"
          stroke={sandColor}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeDasharray="1.5 3"
        />
        <AnimatedCircle
          animatedProps={grainAnimatedProps}
          cx={52}
          cy={52}
          r={1.7}
          fill={sandColor}
        />
      </Svg>
    </View>
  );
}
