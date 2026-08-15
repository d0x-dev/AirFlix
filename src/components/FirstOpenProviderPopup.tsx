import React, {useState, useEffect} from 'react';
import {Modal, View, Pressable, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AppText from './ui/Text';
import {useM3Colors} from '../theme/M3PaletteContext';
import {settingsStorage} from '../lib/storage';

const FirstOpenProviderPopup = () => {
  const [visible, setVisible] = useState(false);
  const colors = useM3Colors();
  const navigation = useNavigation<any>();

  useEffect(() => {
    const hasShown = settingsStorage.hasShownProviderPopup();
    if (!hasShown) {
      // Small delay so it pops up gracefully after boot
      const timer = setTimeout(() => {
        setVisible(true);
        settingsStorage.setHasShownProviderPopup(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={() => setVisible(false)}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: colors.surfaceContainerHigh }]}>
          <AppText role="titleLarge" style={{ color: colors.onSurface, marginBottom: 12, fontWeight: 'bold' }}>
            Welcome to AirFlix!
          </AppText>
          <AppText role="bodyLarge" style={{ color: colors.onSurfaceVariant, marginBottom: 24, lineHeight: 22 }}>
            For better results, install more providers! If you face any issues finding streams, try changing your active provider.
          </AppText>
          <View style={styles.actions}>
            <Pressable
              onPress={() => setVisible(false)}
              style={({pressed}) => [
                styles.button,
                {
                  backgroundColor: pressed ? colors.surfaceContainerHighest : 'transparent',
                  marginRight: 8,
                },
              ]}>
              <AppText role="labelLarge" style={{color: colors.onSurfaceVariant}}>
                Close
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => {
                setVisible(false);
                // Navigate to Extensions screen to manage providers
                navigation.navigate('SettingsStack', {screen: 'Extensions'});
              }}
              style={({pressed}) => [
                styles.button,
                styles.primaryButton,
                {
                  backgroundColor: '#38bdf8', // Light blue accent color
                  opacity: pressed ? 0.8 : 1,
                },
              ]}>
              <AppText role="labelLarge" style={{color: '#000000', fontWeight: 'bold'}}>
                Providers
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 28,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  primaryButton: {
    elevation: 2,
  }
});

export default FirstOpenProviderPopup;
