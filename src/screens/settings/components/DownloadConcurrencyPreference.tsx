import React, {useState} from 'react';
import {View} from 'react-native';
import IconButton from '../../../components/ui/IconButton';
import Surface from '../../../components/ui/Surface';
import AppText from '../../../components/ui/Text';
import {updateDownloadConcurrency} from '../../../lib/downloadManager';
import {settingsStorage} from '../../../lib/storage';

const MIN_CONCURRENCY = 1;
const MAX_CONCURRENCY = 5;

const DownloadConcurrencyPreference = ({
  primary: _primary,
}: {
  primary: string;
}) => {
  const [concurrency, setConcurrency] = useState(
    settingsStorage.getDownloadConcurrency(),
  );

  const update = (next: number) => {
    setConcurrency(next);
    updateDownloadConcurrency(next);
  };

  return (
    <View className="mb-6">
      <AppText role="labelLarge" className="mb-3 text-m3-on-surface-variant">
        Downloads
      </AppText>
      <Surface level="low" className="overflow-hidden">
        <View className="flex-row items-center justify-between p-4">
          <View className="mr-4 flex-1">
            <AppText role="bodyLarge" className="text-m3-on-surface">
              Concurrent Downloads
            </AppText>
            <AppText
              role="bodySmall"
              className="mt-1 text-m3-on-surface-variant">
              Extra downloads wait in the queue
            </AppText>
          </View>
          <View className="flex-row items-center gap-2">
            <IconButton
              testID="decrease-download-concurrency"
              icon="minus"
              label="Decrease concurrent downloads"
              disabled={concurrency <= MIN_CONCURRENCY}
              onPress={() => update(Math.max(concurrency - 1, MIN_CONCURRENCY))}
            />
            <AppText
              testID="download-concurrency-value"
              role="titleMediumEmphasized"
              className="w-10 text-center text-m3-on-surface">
              {concurrency}
            </AppText>
            <IconButton
              testID="increase-download-concurrency"
              icon="plus"
              label="Increase concurrent downloads"
              disabled={concurrency >= MAX_CONCURRENCY}
              onPress={() => update(Math.min(concurrency + 1, MAX_CONCURRENCY))}
            />
          </View>
        </View>
      </Surface>
    </View>
  );
};

export default DownloadConcurrencyPreference;
