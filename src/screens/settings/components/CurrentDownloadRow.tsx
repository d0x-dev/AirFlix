import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import {Image, Text, TouchableOpacity, View} from 'react-native';
import {
  formatDownloadBytes,
  formatDownloadSpeed,
} from '../../../lib/downloadFormatting';
import type {
  DownloadItem,
  DownloadStatus,
} from '../../../lib/zustand/downloadsStore';
import {useM3Colors} from '../../../theme/M3PaletteContext';
import DownloadProgressBar from './DownloadProgressBar';

const statusLabels: Record<DownloadStatus, string> = {
  queued: 'Queued',
  starting: 'Starting',
  downloading: 'Downloading',
  pausing: 'Pausing',
  paused: 'Paused',
  finalizing: 'Finalizing',
  completed: 'Completed',
  interrupted: 'Interrupted',
  error: 'Failed',
  missing: 'Missing',
  canceling: 'Canceling',
};

const getSubtitle = (item: DownloadItem): string => {
  if (item.type === 'movie') {
    return 'Movie';
  }
  return (
    [item.seasonTitle, item.episodeName].filter(Boolean).join(' • ') ||
    'Episode'
  );
};

const CurrentDownloadRow = ({
  item,
  primary,
  onCancel,
  onPause,
  onResume,
  onRetry,
  onStartNow,
}: {
  item: DownloadItem;
  primary: string;
  onCancel: () => void;
  onPause: () => void;
  onResume: () => void;
  onRetry: () => void;
  onStartNow: () => void;
}) => {
  const colors = useM3Colors();
  const progress =
    item.totalBytes > 0 ? item.downloadedBytes / item.totalBytes : 0;
  const failed = item.status === 'error' || item.status === 'interrupted';
  const canCancel = item.status !== 'canceling';

  return (
    <View
      className="mb-3 p-3"
      style={{
        backgroundColor: colors.surfaceContainerHigh,
        borderColor: colors.outlineVariant,
        borderRadius: 20,
        borderWidth: 1,
      }}>
      <View className="flex-row">
        <View
          className="h-24 w-16 overflow-hidden"
          style={{
            backgroundColor: colors.surfaceContainerHighest,
            borderRadius: 16,
          }}>
          {item.poster ? (
            <Image
              source={{uri: item.poster}}
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <MaterialCommunityIcons
                name="movie-open-outline"
                size={26}
                color={primary}
              />
            </View>
          )}
        </View>
        <View className="ml-3 flex-1">
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1">
              <Text
                className="text-base font-semibold"
                style={{color: colors.onSurface}}
                numberOfLines={2}>
                {item.title}
              </Text>
              <Text
                className="mt-1 text-xs"
                style={{color: colors.onSurfaceVariant}}
                numberOfLines={1}>
                {getSubtitle(item)}
              </Text>
            </View>
            <Text
              className="text-xs font-medium"
              style={{color: failed ? colors.error : colors.onSurfaceVariant}}>
              {statusLabels[item.status]}
            </Text>
          </View>

          <View className="mt-3">
            <DownloadProgressBar
              progress={progress}
              color={failed ? colors.error : primary}
            />
            <View className="mt-2 flex-row justify-between">
              <Text
                className="text-xs"
                style={{color: colors.onSurfaceVariant}}>
                {formatDownloadBytes(item.downloadedBytes)}
                {item.totalBytes > 0
                  ? ` / ${formatDownloadBytes(item.totalBytes)}`
                  : ''}
              </Text>
              {item.speed > 0 && (
                <Text
                  className="text-xs"
                  style={{color: colors.onSurfaceVariant}}>
                  {formatDownloadSpeed(item.speed)}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>

      {failed && item.errorMessage && (
        <Text className="mt-3 text-sm" style={{color: colors.error}}>
          {item.errorMessage}
        </Text>
      )}

      <View className="mt-3 flex-row justify-end gap-2">
        {item.status === 'queued' && (
          <TouchableOpacity
            testID={`start-now-download-${item.id}`}
            accessibilityLabel={`Start ${item.title} now`}
            onPress={onStartNow}
            className="flex-row items-center px-3 py-2"
            style={{
              backgroundColor: colors.secondaryContainer,
              borderRadius: 14,
            }}>
            <MaterialCommunityIcons
              name="play-circle-outline"
              size={18}
              color={colors.onSecondaryContainer}
            />
            <Text
              className="ml-1 text-sm font-bold"
              style={{color: colors.onSecondaryContainer}}>
              Start now
            </Text>
          </TouchableOpacity>
        )}
        {item.canPause && item.status === 'downloading' && (
          <TouchableOpacity
            testID={`pause-download-${item.id}`}
            onPress={onPause}
            className="flex-row items-center px-3 py-2"
            style={{
              backgroundColor: colors.surfaceContainerHighest,
              borderRadius: 14,
            }}>
            <MaterialCommunityIcons name="pause" size={18} color={primary} />
            <Text
              className="ml-1 text-sm font-medium"
              style={{color: colors.onSurface}}>
              Pause
            </Text>
          </TouchableOpacity>
        )}
        {item.canResume && item.status === 'paused' && (
          <TouchableOpacity
            testID={`resume-download-${item.id}`}
            onPress={onResume}
            className="flex-row items-center px-3 py-2"
            style={{
              backgroundColor: colors.surfaceContainerHighest,
              borderRadius: 14,
            }}>
            <MaterialCommunityIcons name="play" size={18} color={primary} />
            <Text
              className="ml-1 text-sm font-medium"
              style={{color: colors.onSurface}}>
              Resume
            </Text>
          </TouchableOpacity>
        )}
        {failed && item.retryable && (
          <TouchableOpacity
            onPress={onRetry}
            className="flex-row items-center px-3 py-2"
            style={{
              backgroundColor: colors.surfaceContainerHighest,
              borderRadius: 14,
            }}>
            <MaterialCommunityIcons name="refresh" size={18} color={primary} />
            <Text
              className="ml-1 text-sm font-medium"
              style={{color: colors.onSurface}}>
              Retry
            </Text>
          </TouchableOpacity>
        )}
        {canCancel && (
          <TouchableOpacity
            onPress={onCancel}
            className="flex-row items-center px-3 py-2"
            style={{
              backgroundColor: colors.errorContainer,
              borderRadius: 14,
            }}>
            <MaterialCommunityIcons
              name="close"
              size={18}
              color={colors.onErrorContainer}
            />
            <Text
              className="ml-1 text-sm font-medium"
              style={{color: colors.onErrorContainer}}>
              Cancel
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default CurrentDownloadRow;
