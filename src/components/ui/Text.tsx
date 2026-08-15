import React from 'react';
import {Text as NativeText, TextProps} from 'react-native';
import {M3_TYPE, M3TypeRole} from '../../theme/typography';

export const RawText = NativeText;

interface AppTextProps extends Omit<TextProps, 'role'> {
  role?: M3TypeRole;
}

const AppText = ({role = 'bodyMedium', style, ...props}: AppTextProps) => (
  <NativeText {...props} style={[M3_TYPE[role], style]} />
);

export default AppText;
