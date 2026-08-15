import React from 'react';
import {Text as NativeText, TextProps} from 'react-native';
import {getM3Type, M3TypeRole} from '../../theme/typography';
import useThemeStore from '../../lib/zustand/themeStore';

export const RawText = NativeText;

interface AppTextProps extends Omit<TextProps, 'role'> {
  role?: M3TypeRole;
}

const AppText = ({role = 'bodyMedium', style, ...props}: AppTextProps) => {
  const useLinoteeFont = useThemeStore(s => s.useLinoteeFont);
  const m3Type = getM3Type(useLinoteeFont);
  
  return <NativeText {...props} style={[m3Type[role], style]} />;
};

export default AppText;
