import React from 'react';
import {View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const StatusBarScrim = ({visible}: {visible: boolean}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="none"
      style={{
        backgroundColor: visible ? '#000000' : 'transparent',
        height: insets.top,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 1000,
      }}
    />
  );
};

export default StatusBarScrim;
