import {
  Button as NativeButton,
  FilledTonalButton,
  Host,
  OutlinedButton,
  Text,
  TextButton,
} from '@expo/ui/jetpack-compose';
import {defaultMinSize} from '@expo/ui/jetpack-compose/modifiers';
import React, {ReactNode} from 'react';
import {ColorValue, Pressable, StyleSheet, View, ViewStyle} from 'react-native';
import {useM3Colors, useM3HostTheme} from '../../theme/M3PaletteContext';

type ButtonVariant =
  | 'filled'
  | 'tonal'
  | 'outlined'
  | 'text'
  | 'destructive'
  | 'white';

interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  compact?: boolean;
  disabled?: boolean | null;
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
  containerColor?: ColorValue;
  contentColor?: ColorValue;
}

const Button = ({
  children,
  variant = 'filled',
  compact = false,
  disabled,
  onPress,
  style,
  testID,
  containerColor,
  contentColor,
}: ButtonProps) => {
  const colors = useM3Colors();
  const hostTheme = useM3HostTheme();
  const ButtonComponent =
    variant === 'tonal'
      ? FilledTonalButton
      : variant === 'outlined'
        ? OutlinedButton
        : variant === 'text'
          ? TextButton
          : NativeButton;
  const variantColors =
    variant === 'destructive'
      ? {containerColor: colors.error, contentColor: colors.onError}
      : variant === 'white'
        ? {containerColor: '#FFFFFF', contentColor: '#211F1E'}
        : variant === 'filled'
          ? {containerColor: colors.primary, contentColor: colors.onPrimary}
          : variant === 'tonal'
            ? {
                containerColor: colors.secondaryContainer,
                contentColor: colors.onSecondaryContainer,
              }
            : {contentColor: colors.primary};
  const buttonColors = {
    ...variantColors,
    ...(containerColor ? {containerColor} : {}),
    ...(contentColor ? {contentColor} : {}),
  };

  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          borderRadius: 999,
          overflow: 'hidden',
          position: 'relative',
        },
        style,
      ]}>
      <Host
        matchContents
        {...hostTheme}
        pointerEvents="none">
        <ButtonComponent
          enabled={!disabled}
          colors={buttonColors}
          contentPadding={
            compact
              ? {start: 16, top: 8, end: 16, bottom: 8}
              : {start: 24, top: 12, end: 24, bottom: 12}
          }
          modifiers={[
            defaultMinSize({
              minWidth: compact ? 64 : 80,
              minHeight: compact ? 40 : 48,
            }),
          ]}>
          <Text
            color={String(buttonColors.contentColor)}
            style={{typography: 'labelLarge', fontWeight: '700'}}>
            {children}
          </Text>
        </ButtonComponent>
      </Host>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{disabled: Boolean(disabled)}}
        android_ripple={{color: String(colors.onSurfaceVariant)}}
        disabled={Boolean(disabled)}
        hitSlop={6}
        onPress={onPress}
        testID={testID}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
};

export default Button;
