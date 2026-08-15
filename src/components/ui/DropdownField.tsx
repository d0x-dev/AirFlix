import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  DropdownMenuItem,
  ExposedDropdownMenu,
  ExposedDropdownMenuBox,
  Host,
  RNHostView,
  Shape,
  Text,
  TextField,
} from '@expo/ui/jetpack-compose';
import {fillMaxWidth, menuAnchor} from '@expo/ui/jetpack-compose/modifiers';
import React, {useState} from 'react';
import {View, ViewStyle} from 'react-native';
import {useM3Colors, useM3HostTheme} from '../../theme/M3PaletteContext';
import {LEGACY_TERTIARY_BACKGROUND} from '../../theme/seeds';

interface DropdownFieldProps<T> {
  options: readonly T[];
  value?: T;
  getKey: (option: T) => string;
  getLabel: (option: T) => string;
  onChange: (option: T) => void;
  placeholder?: string;
  showFullOptionLabels?: boolean;
  style?: ViewStyle;
}

const DropdownField = <T,>({
  options,
  value,
  getKey,
  getLabel,
  onChange,
  placeholder = 'Select',
  showFullOptionLabels = false,
  style,
}: DropdownFieldProps<T>) => {
  const colors = useM3Colors();
  const hostTheme = useM3HostTheme();
  const [expanded, setExpanded] = useState(false);
  const selectedKey = value ? getKey(value) : undefined;
  const selectedOption = options.find(option => getKey(option) === selectedKey);
  const selectedLabel = selectedOption ? getLabel(selectedOption) : placeholder;

  return (
    <Host
      matchContents={{vertical: true}}
      style={[{width: '100%'}, style]}
      {...hostTheme}>
      <ExposedDropdownMenuBox
        expanded={expanded}
        onExpandedChange={setExpanded}>
        <TextField
          readOnly
          singleLine
          modifiers={[menuAnchor(), fillMaxWidth()]}
          shape={Shape.RoundedCorner({
            cornerRadii: {
              topStart: 16,
              topEnd: 16,
              bottomStart: 16,
              bottomEnd: 16,
            },
          })}
          textStyle={{fontSize: 14, color: colors.onSurface}}
          colors={{
            focusedContainerColor: LEGACY_TERTIARY_BACKGROUND,
            unfocusedContainerColor: LEGACY_TERTIARY_BACKGROUND,
            focusedTextColor: colors.onSurface,
            unfocusedTextColor: colors.onSurface,
            focusedIndicatorColor: colors.primary,
            unfocusedIndicatorColor: colors.outlineVariant,
            focusedPlaceholderColor: colors.onSurface,
            unfocusedPlaceholderColor: colors.onSurface,
          }}>
          <TextField.Placeholder>
            <Text
              color={colors.onSurface}
              maxLines={1}
              overflow="ellipsis"
              softWrap={false}>
              {selectedLabel}
            </Text>
          </TextField.Placeholder>
          <TextField.TrailingIcon>
            <RNHostView matchContents>
              <View
                style={{
                  alignItems: 'center',
                  height: 24,
                  justifyContent: 'center',
                  width: 24,
                }}>
                <MaterialCommunityIcons
                  name={expanded ? 'menu-up' : 'menu-down'}
                  size={22}
                  color={colors.primary}
                />
              </View>
            </RNHostView>
          </TextField.TrailingIcon>
        </TextField>
        <ExposedDropdownMenu
          expanded={expanded}
          containerColor={LEGACY_TERTIARY_BACKGROUND}
          onDismissRequest={() => setExpanded(false)}>
          {options.map(option => {
            const key = getKey(option);
            const selected = key === selectedKey;
            return (
              <DropdownMenuItem
                key={key}
                elementColors={{
                  textColor: selected ? colors.primary : colors.onSurface,
                }}
                onClick={() => {
                  onChange(option);
                  setExpanded(false);
                }}>
                <DropdownMenuItem.Text>
                  <Text
                    color={selected ? colors.primary : colors.onSurface}
                    maxLines={showFullOptionLabels ? undefined : 2}
                    overflow={showFullOptionLabels ? undefined : 'ellipsis'}
                    softWrap={showFullOptionLabels}
                    style={{fontWeight: selected ? '700' : '400'}}>
                    {getLabel(option)}
                  </Text>
                </DropdownMenuItem.Text>
              </DropdownMenuItem>
            );
          })}
        </ExposedDropdownMenu>
      </ExposedDropdownMenuBox>
    </Host>
  );
};

export default DropdownField;
