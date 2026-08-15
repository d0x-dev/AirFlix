import React, {useState} from 'react';
import {ToastAndroid, View} from 'react-native';
import {
  getDownloadLocationDisplayValue,
  selectDownloadLocation,
} from '../../../lib/downloadLocation';
import {settingsStorage} from '../../../lib/storage';
import IconButton from '../../../components/ui/IconButton';
import SettingsRow from '../../../components/ui/SettingsRow';
import SettingsSection from '../../../components/ui/SettingsSection';

type DownloadLocationPreferenceProps = {
  primary: string;
};

const DownloadLocationPreference = ({
  primary: _primary,
}: DownloadLocationPreferenceProps) => {
  const [downloadLocation, setDownloadLocation] = useState(
    settingsStorage.getDownloadLocation(),
  );
  const [isPickingFolder, setIsPickingFolder] = useState(false);

  const saveDownloadLocation = (
    location: NonNullable<
      ReturnType<typeof settingsStorage.getDownloadLocationConfig>
    >,
  ) => {
    settingsStorage.setDownloadLocation(location);
    setDownloadLocation(getDownloadLocationDisplayValue(location));
    ToastAndroid.show('Download location updated', ToastAndroid.SHORT);
  };

  const pickDownloadLocation = async () => {
    if (isPickingFolder) {
      return;
    }

    setIsPickingFolder(true);
    try {
      const pickedLocation = await selectDownloadLocation();
      if (pickedLocation) {
        saveDownloadLocation(pickedLocation);
        return;
      }

      ToastAndroid.show('No folder selected', ToastAndroid.SHORT);
    } catch (error) {
      console.log('Error picking download folder:', error);
      ToastAndroid.show('Unable to open folder picker', ToastAndroid.SHORT);
    } finally {
      setIsPickingFolder(false);
    }
  };

  return (
    <View className="mb-6">
      <SettingsSection title="Downloads">
        <SettingsRow
          title="Download location"
          description={downloadLocation}
          divider
          trailing={
            <IconButton
              icon="folder-open-outline"
              label="Choose download location"
              disabled={isPickingFolder}
              onPress={pickDownloadLocation}
            />
          }
        />
        <SettingsRow
          title="Reset download location"
          description="Choose a folder again on the next download"
          divider={false}
          trailing={
            <IconButton
              icon="restore"
              label="Reset download location"
              onPress={() => {
                settingsStorage.resetDownloadLocation();
                setDownloadLocation('Select a download folder');
                ToastAndroid.show(
                  'Download location cleared',
                  ToastAndroid.SHORT,
                );
              }}
            />
          }
        />
      </SettingsSection>
    </View>
  );
};

export default DownloadLocationPreference;
