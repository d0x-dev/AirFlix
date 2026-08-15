import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import {ColorValue, Pressable} from 'react-native';
import {useM3Colors} from '../../theme/M3PaletteContext';

interface IconButtonProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  selected?: boolean;
  filled?: boolean;
  size?: number;
  buttonSize?: number;
  buttonWidth?: number;
  containerColor?: ColorValue;
  contentColor?: ColorValue;
  disabled?: boolean | null;
  onPress?: () => void;
  testID?: string;
}

const IconButton = ({
  icon,
  label,
  selected = false,
  filled = false,
  size = 22,
  buttonSize = 40,
  buttonWidth,
  containerColor,
  contentColor,
  disabled,
  onPress,
  testID,
}: IconButtonProps) => {
  const colors = useM3Colors();
  const hasContainer = selected || filled;
  const resolvedContentColor =
    contentColor || (selected ? colors.onSecondaryContainer : colors.primary);
  const resolvedButtonWidth = buttonWidth || buttonSize;
  const touchWidth = Math.max(resolvedButtonWidth, 48);
  const touchHeight = Math.max(buttonSize, 48);

  return (
    <Pressable
      testID={testID}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{disabled: Boolean(disabled), selected}}
      disabled={Boolean(disabled)}
      hitSlop={8}
      onPress={onPress}
      pressRetentionOffset={24}
      android_ripple={{
        borderless: !buttonWidth,
        color: colors.onSurfaceVariant,
        radius: Math.max(touchWidth, touchHeight) / 2,
      }}
      style={({pressed}) => ({
        alignItems: 'center',
        backgroundColor: hasContainer
          ? containerColor || colors.secondaryContainer
          : pressed
            ? colors.surfaceContainerHigh
            : 'transparent',
        borderRadius: buttonWidth ? buttonSize / 2.8 : touchHeight / 2,
        height: touchHeight,
        justifyContent: 'center',
        opacity: disabled ? 0.38 : pressed ? 0.8 : 1,
        width: touchWidth,
      })}>
      <MaterialCommunityIcons
        name={icon}
        size={size}
        color={resolvedContentColor}
        pointerEvents="none"
      />
    </Pressable>
  );
};

export default IconButton;
