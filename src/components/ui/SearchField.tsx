import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  Host,
  RNHostView,
  Shape,
  Text,
  TextField,
  type TextFieldRef,
  useNativeState,
} from '@expo/ui/jetpack-compose';
import {fillMaxWidth} from '@expo/ui/jetpack-compose/modifiers';
import React, {forwardRef, useEffect, useImperativeHandle, useRef} from 'react';
import {View} from 'react-native';
import {useM3Colors, useM3HostTheme} from '../../theme/M3PaletteContext';

interface SearchFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: (value: string) => void;
  onFocusChange?: (focused: boolean) => void;
  placeholder?: string;
}

export interface SearchFieldRef {
  focus: () => void;
}

const SearchField = forwardRef<SearchFieldRef, SearchFieldProps>(
  (
    {value, onChangeText, onSubmit, onFocusChange, placeholder = 'Search'},
    ref,
  ) => {
    const colors = useM3Colors();
    const hostTheme = useM3HostTheme();
    const nativeValue = useNativeState(value);
    const fieldRef = useRef<TextFieldRef>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        fieldRef.current?.focus();
      },
    }));

    useEffect(() => {
      fieldRef.current?.setText(value);
    }, [value]);

    return (
      <Host
        style={{width: '100%'}}
        matchContents={{vertical: true}}
        {...hostTheme}>
        <TextField
          ref={fieldRef}
          value={nativeValue}
          singleLine
          onValueChange={onChangeText}
          onFocusChanged={onFocusChange}
          keyboardOptions={{
            autoCorrectEnabled: false,
            capitalization: 'none',
            imeAction: 'search',
          }}
          keyboardActions={{onSearch: onSubmit}}
          shape={Shape.Pill({})}
          textStyle={{fontSize: 16}}
          colors={{
            focusedContainerColor: colors.surfaceContainerHigh,
            unfocusedContainerColor: colors.surfaceContainerLow,
            focusedTextColor: colors.onSurface,
            unfocusedTextColor: colors.onSurface,
            cursorColor: colors.primary,
            focusedIndicatorColor: 'transparent',
            unfocusedIndicatorColor: 'transparent',
            focusedLeadingIconColor: colors.primary,
            unfocusedLeadingIconColor: colors.onSurfaceVariant,
            focusedPlaceholderColor: colors.onSurfaceVariant,
            unfocusedPlaceholderColor: colors.onSurfaceVariant,
          }}
          modifiers={[fillMaxWidth()]}>
          <TextField.Placeholder>
            <Text color={colors.onSurfaceVariant}>{placeholder}</Text>
          </TextField.Placeholder>
          <TextField.LeadingIcon>
            <RNHostView matchContents>
              <View style={{height: 24, width: 24}}>
                <MaterialCommunityIcons
                  name="magnify"
                  size={24}
                  color={colors.onSurfaceVariant}
                />
              </View>
            </RNHostView>
          </TextField.LeadingIcon>
        </TextField>
      </Host>
    );
  },
);

export default SearchField;
