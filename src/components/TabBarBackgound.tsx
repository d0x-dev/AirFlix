import {StyleSheet, View} from 'react-native';
import React, {memo} from 'react';
import {useM3Colors} from '../theme/M3PaletteContext';

const TabBarBackgound = memo(() => {
  const colors = useM3Colors();
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: colors.surfaceContainer,
          borderTopColor: colors.outlineVariant,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
      ]}
    />
  );
});

export default TabBarBackgound;
