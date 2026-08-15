import React, {useEffect, useRef} from 'react';
import {InteractionManager} from 'react-native';
import Svg, {G} from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {FilledTabIcon, OutlineTabIcon} from './AnimatedTabIconParts';

const AnimatedG = Animated.createAnimatedComponent(G);

export type AnimatedTabIconName =
  | 'home'
  | 'search'
  | 'watchlist'
  | 'download'
  | 'settings';

type AnimatedTabIconProps = {
  name: AnimatedTabIconName;
  active: boolean;
  color: string;
  size?: number;
};

export function AnimatedTabIcon({
  name,
  active,
  color,
  size = 24,
}: AnimatedTabIconProps) {
  const firstRender = useRef(true);
  const progress = useSharedValue(active ? 1 : 0);
  const filledOpacity = useSharedValue(active ? 0 : 1);
  const outlineOpacity = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    if (active) {
      filledOpacity.value = withTiming(0, {duration: 180});
      outlineOpacity.value = withTiming(1, {duration: 160});
      const interaction = InteractionManager.runAfterInteractions(() => {
        progress.value = 0;
        progress.value = withTiming(1, {
          duration: 700,
          easing: Easing.inOut(Easing.cubic),
        });
      });
      return () => interaction.cancel();
    } else {
      filledOpacity.value = withTiming(1, {duration: 160});
      outlineOpacity.value = withTiming(0, {duration: 120});
    }
  }, [active, filledOpacity, outlineOpacity, progress]);

  const filledAnimatedProps = useAnimatedProps(() => ({
    opacity: filledOpacity.value,
  }));
  const outlineAnimatedProps = useAnimatedProps(() => ({
    opacity: outlineOpacity.value,
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <AnimatedG animatedProps={filledAnimatedProps}>
        <FilledTabIcon name={name} color={color} />
      </AnimatedG>
      <AnimatedG animatedProps={outlineAnimatedProps}>
        <OutlineTabIcon name={name} color={color} progress={progress} />
      </AnimatedG>
    </Svg>
  );
}
