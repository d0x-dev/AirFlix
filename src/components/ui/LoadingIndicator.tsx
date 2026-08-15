import {
  ContainedLoadingIndicator,
  Host,
  LoadingIndicator as NativeLoadingIndicator,
} from '@expo/ui/jetpack-compose';
import {size} from '@expo/ui/jetpack-compose/modifiers';
import React from 'react';
import {View, ViewStyle} from 'react-native';
import {useM3Colors, useM3HostTheme} from '../../theme/M3PaletteContext';

interface LoadingIndicatorProps {
  contained?: boolean;
  size?: number;
  style?: ViewStyle;
}

const LoadingIndicator = ({
  contained = false,
  size: indicatorSize = 40,
  style,
}: LoadingIndicatorProps) => {
  const colors = useM3Colors();
  const hostTheme = useM3HostTheme();
  const Indicator = contained
    ? ContainedLoadingIndicator
    : NativeLoadingIndicator;

  return (
    <View style={[{alignSelf: 'center'}, style]}>
      <Host matchContents {...hostTheme}>
        <Indicator
          color={colors.primary}
          containerColor={contained ? colors.primaryContainer : undefined}
          modifiers={[size(indicatorSize, indicatorSize)]}
        />
      </Host>
    </View>
  );
};

export default LoadingIndicator;
