import React, {ReactNode} from 'react';
import {View, StyleSheet} from 'react-native';
import AppText from './Text';

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
}

const SettingsSection = ({title, children}: SettingsSectionProps) => (
  <View style={{ marginBottom: 24 }}>
    <AppText 
      role="labelSmall" 
      style={styles.headerTitle}>
      {title.toUpperCase()}
    </AppText>
    <View style={{ borderRadius: 24, backgroundColor: '#232427', overflow: 'hidden' }}>
      {children}
    </View>
  </View>
);

const styles = StyleSheet.create({
  headerTitle: {
    color: '#a0a0a0',
    letterSpacing: 1.2,
    paddingHorizontal: 8,
    paddingBottom: 8,
    fontWeight: 'bold',
  }
});

export default SettingsSection;
