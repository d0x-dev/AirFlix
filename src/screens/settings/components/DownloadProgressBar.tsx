import React from 'react';
import {DimensionValue, View} from 'react-native';

const DownloadProgressBar = ({
  progress,
  color,
}: {
  progress: number;
  color: string;
}) => {
  const width =
    `${Math.min(Math.max(progress, 0), 1) * 100}%` as DimensionValue;
  return (
    <View className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <View
        className="h-full rounded-full"
        style={{width, backgroundColor: color}}
      />
    </View>
  );
};

export default DownloadProgressBar;
