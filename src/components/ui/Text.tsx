import React from 'react';
import {Text as NativeText, TextProps, StyleSheet} from 'react-native';
import {getM3Type, M3TypeRole} from '../../theme/typography';
import useThemeStore from '../../lib/zustand/themeStore';

export const RawText = NativeText;

interface AppTextProps extends Omit<TextProps, 'role'> {
  role?: M3TypeRole;
}

import Animated from 'react-native-reanimated';

const AppText = ({role = 'bodyMedium', style, ...props}: AppTextProps) => {
  const useLinoteeFont = useThemeStore(s => s.useLinoteeFont);
  const m3Type = getM3Type(useLinoteeFont);
  
  // Strip fontWeight from style if using custom font to prevent Android from falling back to Roboto
  const flatStyle = StyleSheet.flatten([m3Type[role], style]);
  if (useLinoteeFont && flatStyle.fontWeight) {
    delete flatStyle.fontWeight;
  }
  
  return <NativeText {...props} style={flatStyle} />;
};

export const AnimatedAppText = Animated.createAnimatedComponent(AppText);

export default AppText;
