import AppText from '../../../components/ui/Text';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import React from 'react';
import {ActivityIndicator, Image, Pressable, Text, View} from 'react-native';
import type {ProviderExtension} from '../../../lib/storage/extensionStorage';
import {useM3Colors} from '../../../theme/M3PaletteContext';

export type ProviderTestStatus = 'untested' | 'testing' | 'working' | 'failed';

interface ProviderCardProps {
  provider: ProviderExtension;
  itemKey: string;
  installed: boolean;
  active: boolean;
  installing: boolean;
  updating: boolean;
  testStatus: ProviderTestStatus;
  hasUpdate: boolean;
  primary: string;
  onActivate: () => void;
  onInstall: () => void;
  onUpdate: () => void;
  onTest: () => void;
  onUninstall: () => void;
}

const ProviderStatusBadge = ({
  status,
  itemKey,
}: {
  status: ProviderTestStatus;
  itemKey: string;
}) => {
  const colors = useM3Colors();

  if (status === 'testing') {
    return (
      <View
        testID={`provider-status-${itemKey}-testing`}
        className="h-8 flex-row items-center px-3"
        style={{
          backgroundColor: colors.secondaryContainer,
          borderRadius: 16,
        }}>
        <ActivityIndicator size={14} color={colors.onSecondaryContainer} />
        <AppText
          className="ml-2 text-xs font-bold"
          style={{color: colors.onSecondaryContainer}}>
          Testing
        </AppText>
      </View>
    );
  }

  const failed = status === 'failed';
  const working = status === 'working';
  const label = failed ? 'Failed' : working ? 'Working' : 'Not tested';
  const icon = failed ? 'close-circle' : working ? 'check-circle' : 'circle';
  const containerColor = failed
    ? colors.errorContainer
    : working
      ? colors.tertiaryContainer
      : colors.surfaceContainerHighest;
  const contentColor = failed
    ? colors.onErrorContainer
    : working
      ? colors.onTertiaryContainer
      : colors.onSurfaceVariant;

  return (
    <View
      testID={`provider-status-${itemKey}-${status}`}
      className="h-8 flex-row items-center px-3"
      style={{
        backgroundColor: containerColor,
        borderRadius: 16,
      }}>
      <MaterialCommunityIcons
        name={icon}
        size={status === 'untested' ? 9 : 16}
        color={contentColor}
      />
      <AppText className="ml-2 text-xs font-bold" style={{color: contentColor}}>
        {label}
      </AppText>
    </View>
  );
};

const MetadataChip = ({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
}) => {
  const colors = useM3Colors();
  return (
    <View
      className="mr-2 mt-2 max-w-36 flex-row items-center px-2.5 py-1.5"
      style={{
        backgroundColor: colors.surfaceContainerHighest,
        borderRadius: 10,
      }}>
      <MaterialCommunityIcons
        name={icon}
        size={15}
        color={colors.onSurfaceVariant}
      />
      <AppText
        className="ml-1.5 text-xs capitalize"
        style={{color: colors.onSurfaceVariant}}
        numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
};

const ProviderCard = ({
  provider,
  itemKey,
  installed,
  active,
  installing,
  updating,
  testStatus,
  hasUpdate,
  primary,
  onActivate,
  onInstall,
  onUpdate,
  onTest,
  onUninstall,
}: ProviderCardProps) => {
  const colors = useM3Colors();

  return (
    <View
      className="mx-4 mb-3 overflow-hidden"
      style={{
        backgroundColor: colors.surfaceContainerHigh,
        borderColor: active ? colors.primary : colors.outlineVariant,
        borderRadius: 24,
        borderWidth: active ? 2 : 1,
      }}>
      <Pressable
        disabled={!installed}
        onPress={onActivate}
        className="flex-row items-start p-4"
        style={({pressed}) => ({opacity: pressed ? 0.78 : 1})}>
        <View
          className="h-14 w-14 items-center justify-center overflow-hidden"
          style={{
            backgroundColor: active
              ? colors.primary
              : colors.surfaceContainerHighest,
            borderRadius: 18,
          }}>
          {provider.icon ? (
            <Image
              source={{uri: provider.icon}}
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : (
            <MaterialCommunityIcons
              name="web"
              size={32}
              color={active ? colors.onPrimary : colors.onSurface}
            />
          )}
        </View>

        <View className="ml-3 min-w-0 flex-1">
          <View className="flex-row items-center">
            <AppText
              className="shrink text-xl font-bold"
              style={{color: colors.onSurface}}
              numberOfLines={1}>
              {provider.display_name || 'Unknown Provider'}
            </AppText>
            <AppText
              className="ml-2 text-xs font-semibold"
              style={{color: colors.onSurfaceVariant}}>
              v{provider.version || 'Unknown'}
            </AppText>
          </View>
          <View className="flex-row flex-wrap">
            <MetadataChip icon="web" label={provider.type || 'Unknown'} />
            {provider.source?.author && (
              <MetadataChip icon="account" label={provider.source.author} />
            )}
          </View>
        </View>

        {installed && (
          <View className="ml-2 items-end gap-2">
            {hasUpdate && (
              <Pressable
                testID={`update-provider-${itemKey}`}
                accessibilityLabel={`Update ${provider.display_name}`}
                disabled={updating}
                onPress={onUpdate}
                className="h-9 w-9 items-center justify-center"
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 14,
                }}>
                {updating ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <MaterialCommunityIcons
                    name="update"
                    size={20}
                    color={colors.onPrimary}
                  />
                )}
              </Pressable>
            )}
            <ProviderStatusBadge status={testStatus} itemKey={itemKey} />
          </View>
        )}
      </Pressable>

      <View
        className="mx-4 h-px"
        style={{backgroundColor: colors.outlineVariant}}
      />

      {installed ? (
        <View className="flex-row gap-2 p-3">
          <Pressable
            testID={`test-provider-${itemKey}`}
            accessibilityLabel={`Test ${provider.display_name}`}
            disabled={testStatus === 'testing'}
            onPress={onTest}
            className="h-12 flex-1 flex-row items-center justify-center"
            style={({pressed}) => ({
              backgroundColor: pressed
                ? colors.surfaceBright
                : colors.surfaceContainerHighest,
              borderRadius: 16,
            })}>
            {testStatus === 'testing' ? (
              <ActivityIndicator size="small" color={primary} />
            ) : (
              <MaterialCommunityIcons name="flask" size={21} color={primary} />
            )}
            <AppText
              className="ml-2 text-sm font-bold"
              style={{color: colors.onSurface}}>
              {testStatus === 'testing' ? 'Testing' : 'Test'}
            </AppText>
          </Pressable>

          <Pressable
            testID={`uninstall-provider-${itemKey}`}
            accessibilityLabel={`Uninstall ${provider.display_name}`}
            onPress={onUninstall}
            className="h-12 flex-1 flex-row items-center justify-center"
            style={({pressed}) => ({
              backgroundColor: colors.errorContainer,
              borderRadius: 16,
              opacity: pressed ? 0.75 : 1,
            })}>
            <MaterialCommunityIcons
              name="delete-outline"
              size={20}
              color={colors.onErrorContainer}
            />
            <AppText
              className="ml-2 text-sm font-bold"
              style={{color: colors.onErrorContainer}}>
              Uninstall
            </AppText>
          </Pressable>
        </View>
      ) : (
        <Pressable
          testID={`install-provider-${itemKey}`}
          disabled={installing}
          onPress={onInstall}
          className="m-3 h-12 flex-row items-center justify-center"
          style={{
            backgroundColor: colors.primary,
            borderRadius: 16,
          }}>
          {installing ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <MaterialCommunityIcons
              name="download"
              size={20}
              color={colors.onPrimary}
            />
          )}
          <AppText
            className="ml-2 text-sm font-bold"
            style={{color: colors.onPrimary}}>
            {installing ? 'Installing' : 'Install'}
          </AppText>
        </Pressable>
      )}
    </View>
  );
};

export default React.memo(ProviderCard);
