import React from 'react';
import {Switch, View} from 'react-native';
import {useM3Colors} from '../../theme/M3PaletteContext';
import AppText from './Text';

interface SettingsSwitchRowProps {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  divider?: boolean;
}

const SettingsSwitchRow = ({
  title,
  description,
  value,
  onValueChange,
  divider = true,
}: SettingsSwitchRowProps) => {
  const colors = useM3Colors();

  return (
    <View
      className="min-h-16 flex-row items-center px-4 py-3"
      style={{
        borderBottomColor: colors.outlineVariant,
        borderBottomWidth: divider ? 1 : 0,
      }}>
      <View className="mr-4 flex-1">
        <AppText role="bodyLarge" style={{color: colors.onSurface}}>
          {title}
        </AppText>
        {description ? (
          <AppText
            role="bodySmall"
            style={{color: colors.onSurfaceVariant, marginTop: 3}}>
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        thumbColor={value ? colors.onPrimary : colors.outline}
        trackColor={{
          false: colors.surfaceContainerHighest,
          true: colors.primary,
        }}
      />
    </View>
  );
};

export default SettingsSwitchRow;
