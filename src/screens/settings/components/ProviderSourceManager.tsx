import AppText from '../../../components/ui/Text';
import React, {useEffect, useMemo, useState} from 'react';
import {Linking, Pressable, ScrollView, TextInput, View} from 'react-native';
import {MaterialCommunityIcons, MaterialIcons} from '@expo/vector-icons';
import {
  extensionStorage,
  ProviderSource,
} from '../../../lib/storage/extensionStorage';
import {createProviderSource} from '../../../lib/utils/helpers';
import {socialLinks} from '../../../lib/constants';
import {useM3Colors} from '../../../theme/M3PaletteContext';
import AppDialog from '../../../components/AppDialog';
import MaterialDialogSurface from '../../../components/ui/MaterialDialogSurface';
import {readableOnColor} from '../../../theme/seeds';
import Text from '../../../components/ui/Text';

type Props = {
  primary: string;
  visible: boolean;
  onSourceChanged: (source: ProviderSource | undefined) => void | Promise<void>;
};

const ProviderSourceManager = ({primary, visible, onSourceChanged}: Props) => {
  const colors = useM3Colors();
  const [sources, setSources] = useState<ProviderSource[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [invalidSourceDialog, setInvalidSourceDialog] = useState(false);
  const [sourceToRemove, setSourceToRemove] = useState<string>();

  const defaultSource = useMemo(() => {
    return sources.find(item => item.isDefault) || sources[0];
  }, [sources]);

  const reloadSources = () => {
    const nextSources = extensionStorage.getProviderSources();
    setSources(nextSources);
    if (nextSources.length === 0) {
      setShowSourcePicker(false);
      setShowAddDialog(true);
    }
  };

  useEffect(() => {
    if (!visible) {
      return;
    }

    const currentSources = extensionStorage.getProviderSources();
    setSources(currentSources);

    if (currentSources.length === 0) {
      setShowAddDialog(true);
    }
  }, [visible]);

  const handleSelectSource = async (source: ProviderSource) => {
    setShowSourcePicker(false);
    extensionStorage.setDefaultProviderSource(source.author);
    reloadSources();
    await onSourceChanged(extensionStorage.getProviderSource());
  };

  const handleConfirmAdd = async () => {
    try {
      const parsedSource = createProviderSource(inputValue);
      extensionStorage.addProviderSources(
        parsedSource.author,
        parsedSource.url,
      );
      extensionStorage.setDefaultProviderSource(parsedSource.author);
      setInputValue('');
      setShowAddDialog(false);
      reloadSources();
      await onSourceChanged(extensionStorage.getProviderSource());
    } catch (error) {
      setInvalidSourceDialog(true);
    }
  };

  const handleRemoveSource = (author: string) => {
    setSourceToRemove(author);
  };

  const confirmRemoveSource = async () => {
    if (!sourceToRemove) {
      return;
    }
    const installedForSource = extensionStorage
      .getInstalledProviders()
      .filter(provider => provider.source?.author === sourceToRemove);

    installedForSource.forEach(provider => {
      extensionStorage.uninstallProvider(provider.value, sourceToRemove);
    });

    extensionStorage.removeProviderSource(sourceToRemove);
    setSourceToRemove(undefined);
    reloadSources();
    await onSourceChanged(extensionStorage.getProviderSource());
  };

  if (!visible) {
    return null;
  }

  return (
    <View className="mx-4 mt-3">
      <AppText
        className="mb-2 ml-1 text-sm font-bold"
        style={{color: colors.onSurfaceVariant}}>
        Provider source
      </AppText>
      <View className="flex-row items-stretch gap-2">
        <View className="flex-1 overflow-hidden">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select provider source"
            className="h-16 flex-row items-center px-4"
            style={({pressed}) => ({
              backgroundColor: pressed
                ? colors.surfaceBright
                : colors.surfaceContainerHigh,
              borderColor: colors.outlineVariant,
              borderRadius: 20,
              borderWidth: 1,
            })}
            onPress={() => setShowSourcePicker(true)}>
            <View
              className="h-10 w-10 items-center justify-center"
              style={{
                backgroundColor: '#171717',
                borderColor: colors.outlineVariant,
                borderRadius: 15,
                borderWidth: 1,
              }}>
              <MaterialCommunityIcons
                name="source-repository"
                size={20}
                color={colors.primary}
              />
            </View>
            <View className="ml-3 flex-1">
              <AppText
                className="text-xs font-medium"
                style={{color: colors.onSurfaceVariant}}>
                Active source
              </AppText>
              <AppText
                className="mt-0.5 text-base font-bold"
                style={{
                  color: defaultSource
                    ? colors.onSurface
                    : colors.onSurfaceVariant,
                }}
                numberOfLines={1}>
                {defaultSource?.author || 'Add a provider source'}
              </AppText>
            </View>
            <MaterialIcons
              name="expand-more"
              size={24}
              color={colors.onSurfaceVariant}
            />
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add provider source"
          className="h-16 w-16 items-center justify-center"
          style={({pressed}) => ({
            backgroundColor: pressed ? colors.surfaceBright : '#171717',
            borderColor: primary,
            borderRadius: 20,
            borderWidth: 2,
          })}
          onPress={() => setShowAddDialog(true)}>
          <MaterialCommunityIcons name="plus" size={28} color={primary} />
        </Pressable>
      </View>

      <MaterialDialogSurface
        visible={showSourcePicker}
        onDismiss={() => setShowSourcePicker(false)}
        style={{maxHeight: 560}}>
        <View className="mb-3 flex-row items-center justify-between">
          <View>
            <AppText
              className="text-lg font-semibold"
              style={{color: colors.onSurface}}>
              Provider source
            </AppText>
            <AppText
              className="mt-1 text-xs"
              style={{color: colors.onSurfaceVariant}}>
              Select or remove a source
            </AppText>
          </View>
          <Pressable
            accessibilityLabel="Close source picker"
            className="h-10 w-10 items-center justify-center"
            style={{
              backgroundColor: colors.surfaceContainerHighest,
              borderRadius: 14,
            }}
            onPress={() => setShowSourcePicker(false)}>
            <MaterialCommunityIcons
              name="close"
              size={24}
              color={colors.onSurfaceVariant}
            />
          </Pressable>
        </View>

        <ScrollView nestedScrollEnabled>
          {sources.map(source => {
            const isSelected = source.author === defaultSource?.author;
            return (
              <View
                key={source.author}
                className="mb-2 flex-row items-center border px-3 py-3"
                style={{
                  backgroundColor: colors.surfaceContainerHighest,
                  borderColor: isSelected
                    ? colors.primary
                    : colors.outlineVariant,
                  borderRadius: 16,
                  borderWidth: isSelected ? 2 : 1,
                }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Use ${source.author} source`}
                  className="flex-1 flex-row items-center pr-2"
                  onPress={() => handleSelectSource(source)}>
                  <View className="flex-1">
                    <AppText
                      className="font-semibold"
                      style={{color: colors.onSurface}}>
                      {source.author}
                    </AppText>
                    <AppText
                      className="mt-1 text-xs"
                      style={{color: colors.onSurfaceVariant}}
                      numberOfLines={1}>
                      {source.url}
                    </AppText>
                  </View>
                  {isSelected && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={22}
                      color={colors.primary}
                    />
                  )}
                </Pressable>
                <Pressable
                  accessibilityLabel={`Remove ${source.author} source`}
                  className="ml-3 h-10 w-10 items-center justify-center"
                  style={{
                    backgroundColor: colors.errorContainer,
                    borderRadius: 14,
                  }}
                  onPress={() => handleRemoveSource(source.author)}>
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={20}
                    color={colors.onErrorContainer}
                  />
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      </MaterialDialogSurface>

      <MaterialDialogSurface
        visible={showAddDialog}
        onDismiss={() => {
          setShowAddDialog(false);
          setInputValue('');
        }}>
        <View className="flex-row items-center justify-between mb-3">
          <AppText
            className="text-base font-semibold w-fit"
            style={{color: colors.onSurface}}
            numberOfLines={1}>
            Add Source
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close add source dialog"
            className="h-10 w-10 items-center justify-center"
            style={{
              backgroundColor: colors.surfaceContainerHighest,
              borderRadius: 14,
            }}
            onPress={() => {
              setShowAddDialog(false);
              setInputValue('');
            }}>
            <MaterialCommunityIcons
              name="close"
              size={22}
              color={colors.onSurfaceVariant}
            />
          </Pressable>
        </View>
        <AppText className="text-sm font-medium" style={{color: colors.onSurface}}>
          Enter url of your hosted provider source or GitHub author
        </AppText>
        <AppText
          className="text-sm mt-[4px]"
          style={{color: colors.onSurfaceVariant, lineHeight: 20}}>
          How to create provider{' '}
          <AppText
            accessibilityRole="link"
            style={{color: '#38BDF8', fontSize: 14, lineHeight: 20}}
            onPress={() => Linking.openURL(socialLinks.github + '#AirFlix')}>
            here
          </AppText>
        </AppText>
        <AppText
          className="text-sm mt-[4px]"
          style={{color: colors.onSurfaceVariant, lineHeight: 20}}>
          or join Discord for support{' '}
          <AppText
            accessibilityRole="link"
            style={{color: '#38BDF8', fontSize: 14, lineHeight: 20}}
            onPress={() => Linking.openURL(socialLinks.discord)}>
            Discord
          </AppText>
        </AppText>
        <TextInput
          className="h-14 px-4 mt-4"
          style={{
            backgroundColor: colors.surfaceContainerHighest,
            borderColor: colors.outlineVariant,
            borderRadius: 18,
            borderWidth: 1,
            color: colors.onSurface,
          }}
          placeholder="GitHub author or source URL"
          placeholderTextColor={colors.onSurfaceVariant}
          selectionColor={colors.primary}
          value={inputValue}
          onChangeText={setInputValue}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View className="flex-row gap-2 mt-3">
          <Pressable
            className="h-12 flex-1 items-center justify-center"
            style={{
              backgroundColor: colors.surfaceContainerHighest,
              borderRadius: 16,
            }}
            onPress={() => {
              setShowAddDialog(false);
              setInputValue('');
            }}>
            <AppText className="font-medium" style={{color: colors.onSurface}}>
              Cancel
            </AppText>
          </Pressable>

          <Pressable
            className="h-12 flex-1 items-center justify-center"
            style={{
              backgroundColor: colors.primary,
              borderRadius: 16,
            }}
            onPress={handleConfirmAdd}>
            <AppText
              className="font-medium"
              style={{color: readableOnColor(colors.primary)}}>
              Confirm
            </AppText>
          </Pressable>
        </View>
      </MaterialDialogSurface>

      <AppDialog
        visible={invalidSourceDialog}
        title="Invalid source"
        message="Enter a valid source URL or GitHub author."
        primary={primary}
        variant="error"
        onDismiss={() => setInvalidSourceDialog(false)}
      />
      <AppDialog
        visible={Boolean(sourceToRemove)}
        title="Remove source?"
        message={`Remove ${sourceToRemove || 'this source'} from provider sources? Installed providers from it will also be removed.`}
        primary={primary}
        variant="warning"
        actions={[
          {label: 'Cancel'},
          {
            label: 'Remove',
            variant: 'destructive',
            onPress: confirmRemoveSource,
          },
        ]}
        onDismiss={() => setSourceToRemove(undefined)}
      />
    </View>
  );
};

export default ProviderSourceManager;
