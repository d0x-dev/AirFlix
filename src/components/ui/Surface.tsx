import {
  Host,
  RNHostView,
  Shape,
  Surface as NativeSurface,
} from '@expo/ui/jetpack-compose';
import React from 'react';
import {View, ViewProps} from 'react-native';
import {useM3Colors, useM3HostTheme} from '../../theme/M3PaletteContext';

type SurfaceLevel = 'lowest' | 'low' | 'default' | 'high' | 'highest';

interface SurfaceProps extends ViewProps {
  level?: SurfaceLevel;
  outlined?: boolean;
}

const Surface = ({
  level = 'default',
  outlined = false,
  style,
  ...props
}: SurfaceProps) => {
  const colors = useM3Colors();
  const hostTheme = useM3HostTheme();
  const backgrounds: Record<SurfaceLevel, string> = {
    lowest: colors.surfaceContainerLowest,
    low: colors.surfaceContainerLow,
    default: colors.surfaceContainer,
    high: colors.surfaceContainerHigh,
    highest: colors.surfaceContainerHighest,
  };

  return (
    <Host matchContents {...hostTheme}>
      <NativeSurface
        color={backgrounds[level]}
        contentColor={colors.onSurface}
        shape={Shape.RoundedCorner({
          cornerRadii: {
            topStart: 28,
            topEnd: 28,
            bottomStart: 28,
            bottomEnd: 28,
          },
        })}
        border={outlined ? {width: 1, color: colors.outline} : undefined}>
        <RNHostView matchContents>
          <View {...props} style={style} />
        </RNHostView>
      </NativeSurface>
    </Host>
  );
};

export default Surface;
