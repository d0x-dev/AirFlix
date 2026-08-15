import AppText from '../../../components/ui/Text';
import React from 'react';
import {Text, View} from 'react-native';
import {
  cancelDownload,
  pauseDownload,
  resumeDownload,
  retryDownload,
  startQueuedDownloadNow,
} from '../../../lib/downloadManager';
import useDownloadsStore, {
  selectCurrentDownloads,
} from '../../../lib/zustand/downloadsStore';
import {useM3Colors} from '../../../theme/M3PaletteContext';
import CurrentDownloadRow from './CurrentDownloadRow';

const CurrentDownloadsSection = ({primary}: {primary: string}) => {
  const colors = useM3Colors();
  const downloads = useDownloadsStore(selectCurrentDownloads);

  if (downloads.length === 0) {
    return null;
  }

  return (
    <View className="mb-5">
      <View className="mb-3 flex-row items-center justify-between">
        <AppText
          className="text-xl font-bold"
          style={{color: colors.onBackground}}>
          Current Downloads
        </AppText>
        <View
          className="min-w-8 items-center px-2 py-1"
          style={{
            backgroundColor: colors.secondaryContainer,
            borderRadius: 12,
          }}>
          <AppText
            className="text-xs font-bold"
            style={{color: colors.onSecondaryContainer}}>
            {downloads.length}
          </AppText>
        </View>
      </View>
      {downloads.map(item => (
        <CurrentDownloadRow
          key={item.id}
          item={item}
          primary={primary}
          onCancel={() => cancelDownload(item.id).catch(console.error)}
          onPause={() => pauseDownload(item.id).catch(console.error)}
          onResume={() => resumeDownload(item.id).catch(console.error)}
          onRetry={() => retryDownload(item.id).catch(console.error)}
          onStartNow={() =>
            startQueuedDownloadNow(item.id).catch(console.error)
          }
        />
      ))}
    </View>
  );
};

export default CurrentDownloadsSection;
