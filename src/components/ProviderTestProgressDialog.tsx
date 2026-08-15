import {MaterialCommunityIcons} from '@expo/vector-icons';
import React from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import type {
  ProviderDiagnosticProgressStage,
  ProviderDiagnosticProgress,
} from '../lib/services/providerDiagnostics';
import {useM3Colors} from '../theme/M3PaletteContext';
import {readableOnColor} from '../theme/seeds';
import MaterialDialogSurface from './ui/MaterialDialogSurface';

export type ProviderTestStepStatus =
  | 'pending'
  | ProviderDiagnosticProgress['status'];

export type ProviderTestStepState = Record<
  ProviderDiagnosticProgressStage,
  ProviderTestStepStatus
>;

interface ProviderTestProgressDialogProps {
  visible: boolean;
  providerName: string;
  steps: ProviderTestStepState;
  resultMessage?: string;
  primary: string;
  onClose: () => void;
}

const stepLabels: Array<{
  stage: ProviderDiagnosticProgressStage;
  label: string;
}> = [
  {stage: 'catalog', label: 'Catalog'},
  {stage: 'posts', label: 'Show list'},
  {stage: 'metadata', label: 'Metadata'},
  {stage: 'playback', label: 'Playback'},
  {stage: 'streams', label: 'Streams'},
];

const ProviderTestProgressDialog = ({
  visible,
  providerName,
  steps,
  resultMessage,
  primary,
  onClose,
}: ProviderTestProgressDialogProps) => {
  const colors = useM3Colors();
  const statuses = Object.values(steps);
  const hasFailed = statuses.some(status => status === 'failed');
  const hasPassed = statuses.every(status => status === 'completed');
  const isFinished = hasFailed || hasPassed;
  const primaryContentColor = readableOnColor(colors.primary);

  return (
    <MaterialDialogSurface
      visible={visible}
      dismissible={isFinished}
      onDismiss={onClose}>
      <Text
        style={{
          color: colors.onSurface,
          fontSize: 22,
          fontWeight: '700',
        }}>
        {hasFailed
          ? 'Provider test failed'
          : hasPassed
            ? 'Provider test passed'
            : 'Testing provider'}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          color: colors.onSurfaceVariant,
          fontSize: 14,
          marginBottom: 20,
          marginTop: 4,
        }}>
        {providerName}
      </Text>

      <View className="gap-3">
        {stepLabels.map(({stage, label}) => {
          const status = steps[stage];
          return (
            <View
              key={stage}
              testID={`provider-test-step-${stage}-${status}`}
              className="h-11 flex-row items-center px-3"
              style={{
                backgroundColor: colors.surfaceContainerHighest,
                borderRadius: 14,
              }}>
              <View className="mr-3 h-7 w-7 items-center justify-center">
                {status === 'running' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <MaterialCommunityIcons
                    name={
                      status === 'completed'
                        ? 'check-circle'
                        : status === 'failed'
                          ? 'close-circle'
                          : 'circle-outline'
                    }
                    size={22}
                    color={
                      status === 'completed'
                        ? '#22C55E'
                        : status === 'failed'
                          ? '#EF4444'
                          : '#6B7280'
                    }
                  />
                )}
              </View>
              <Text
                className="flex-1 font-medium"
                style={{color: colors.onSurface}}>
                {label}
              </Text>
              <Text
                className="text-xs capitalize"
                style={{color: colors.onSurfaceVariant}}>
                {status}
              </Text>
            </View>
          );
        })}
      </View>

      {resultMessage && (
        <Text
          testID="provider-test-result"
          className="mt-4 p-3 text-sm leading-5"
          style={{
            backgroundColor: hasFailed
              ? colors.errorContainer
              : colors.tertiaryContainer,
            borderRadius: 14,
            color: hasFailed
              ? colors.onErrorContainer
              : colors.onTertiaryContainer,
          }}>
          {resultMessage}
        </Text>
      )}

      {isFinished && (
        <TouchableOpacity
          testID="close-provider-test-progress"
          className="mt-5 items-center px-4 py-3"
          style={{
            backgroundColor: colors.primary,
            borderRadius: 18,
          }}
          onPress={onClose}>
          <Text className="font-semibold" style={{color: primaryContentColor}}>
            Done
          </Text>
        </TouchableOpacity>
      )}
    </MaterialDialogSurface>
  );
};

export default ProviderTestProgressDialog;
