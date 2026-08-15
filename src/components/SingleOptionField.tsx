import React from 'react';
import {View} from 'react-native';
import AppText from './ui/Text';

interface SingleOptionFieldProps {
  label: string;
}

const SingleOptionField = ({label}: SingleOptionFieldProps) => (
  <View className="h-10 justify-center rounded-full border border-m3-outline bg-m3-surface-container-high px-4">
    <AppText role="labelLarge" className="text-m3-on-surface" numberOfLines={1}>
      {label}
    </AppText>
  </View>
);

export default SingleOptionField;
