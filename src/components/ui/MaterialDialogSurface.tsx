import {BasicAlertDialog, Host, RNHostView} from '@expo/ui/jetpack-compose';
import React from 'react';
import {View, ViewStyle} from 'react-native';
import {useM3Colors, useM3HostTheme} from '../../theme/M3PaletteContext';

interface MaterialDialogSurfaceProps {
  visible: boolean;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss: () => void;
  style?: ViewStyle;
}

const MaterialDialogSurface = ({
  visible,
  children,
  dismissible = true,
  onDismiss,
  style,
}: MaterialDialogSurfaceProps) => {
  const colors = useM3Colors();
  const hostTheme = useM3HostTheme();

  if (!visible) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={{left: 0, position: 'absolute', top: 0, zIndex: 1000}}>
      <Host matchContents {...hostTheme}>
        <BasicAlertDialog
          onDismissRequest={() => {
            if (dismissible) {
              onDismiss();
            }
          }}>
          <RNHostView matchContents>
            <View
              style={[
                {
                  backgroundColor: colors.surfaceContainerHigh,
                  borderRadius: 28,
                  maxWidth: 420,
                  overflow: 'hidden',
                  padding: 24,
                  width: 340,
                },
                style,
              ]}>
              {children}
            </View>
          </RNHostView>
        </BasicAlertDialog>
      </Host>
    </View>
  );
};

export default MaterialDialogSurface;
