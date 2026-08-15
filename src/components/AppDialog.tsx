import {MaterialCommunityIcons} from '@expo/vector-icons';
import {
  AlertDialog,
  Host,
  RNHostView,
  Text,
  TextButton,
} from '@expo/ui/jetpack-compose';
import React from 'react';
import {ScrollView, Text as ReactNativeText, View} from 'react-native';
import Markdown from 'react-native-markdown-display';
import {useM3Colors, useM3HostTheme} from '../theme/M3PaletteContext';

export type AppDialogVariant = 'info' | 'success' | 'warning' | 'error';

export interface AppDialogAction {
  label: string;
  onPress?: () => void;
  variant?: 'default' | 'primary' | 'destructive';
  testID?: string;
  disabled?: boolean;
  dismissOnPress?: boolean;
}

interface AppDialogProps {
  visible: boolean;
  title: string;
  message: string;
  messageFormat?: 'plain' | 'markdown';
  primary: string;
  variant?: AppDialogVariant;
  actions?: AppDialogAction[];
  onDismiss: () => void;
}

const variantStyles: Record<
  AppDialogVariant,
  {
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    colorRole: 'primary' | 'tertiary' | 'secondary' | 'error';
  }
> = {
  info: {icon: 'information-outline', colorRole: 'primary'},
  success: {icon: 'check-circle-outline', colorRole: 'tertiary'},
  warning: {icon: 'alert-outline', colorRole: 'secondary'},
  error: {icon: 'alert-circle-outline', colorRole: 'error'},
};

const AppDialog = ({
  visible,
  title,
  message,
  messageFormat = 'plain',
  variant = 'info',
  actions = [{label: 'OK', variant: 'primary'}],
  onDismiss,
}: AppDialogProps) => {
  const appearance = variantStyles[variant];
  const colors = useM3Colors();
  const hostTheme = useM3HostTheme();
  const iconColor = colors[appearance.colorRole];
  const confirmAction = actions[actions.length - 1];
  const dismissAction = actions.length > 1 ? actions[0] : undefined;

  const handleAction = (action: AppDialogAction) => {
    action.onPress?.();
    if (action.dismissOnPress !== false) {
      onDismiss();
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={{left: 0, position: 'absolute', top: 0, zIndex: 1000}}>
      <Host matchContents {...hostTheme}>
        <AlertDialog
          colors={{
            containerColor: colors.surfaceContainerHigh,
            iconContentColor: iconColor,
            titleContentColor: colors.onSurface,
            textContentColor: colors.onSurfaceVariant,
          }}
          onDismissRequest={onDismiss}>
          <AlertDialog.Title>
            <RNHostView matchContents>
              <View
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'flex-start',
                  width: 280,
                }}>
                <MaterialCommunityIcons
                  name={appearance.icon}
                  size={28}
                  color={iconColor}
                />
                <ReactNativeText
                  style={{
                    color: colors.onSurface,
                    flex: 1,
                    fontSize: 24,
                    fontWeight: '700',
                    marginLeft: 16,
                    textAlign: 'left',
                  }}>
                  {title}
                </ReactNativeText>
              </View>
            </RNHostView>
          </AlertDialog.Title>
          <AlertDialog.Text>
            {messageFormat === 'markdown' ? (
              <RNHostView matchContents>
                <ScrollView
                  nestedScrollEnabled
                  style={{maxHeight: 360, width: 280}}
                  contentContainerStyle={{paddingRight: 8}}>
                  <Markdown
                    style={{
                      body: {color: colors.onSurfaceVariant, fontSize: 14},
                      bullet_list: {marginVertical: 4},
                      code_inline: {
                        backgroundColor: colors.surfaceContainerHighest,
                        color: colors.onSurface,
                      },
                      fence: {
                        backgroundColor: colors.surfaceContainerHighest,
                        borderColor: colors.outlineVariant,
                        color: colors.onSurface,
                      },
                      heading1: {
                        color: colors.onSurface,
                        fontSize: 20,
                        marginVertical: 8,
                      },
                      heading2: {
                        color: colors.onSurface,
                        fontSize: 18,
                        marginVertical: 7,
                      },
                      heading3: {
                        color: colors.onSurface,
                        fontSize: 16,
                        marginVertical: 6,
                      },
                      link: {color: colors.primary},
                      ordered_list: {marginVertical: 4},
                      paragraph: {marginBottom: 8, marginTop: 0},
                    }}>
                    {message}
                  </Markdown>
                </ScrollView>
              </RNHostView>
            ) : (
              <Text style={{typography: 'bodyMedium'}}>{message}</Text>
            )}
          </AlertDialog.Text>
          {dismissAction ? (
            <AlertDialog.DismissButton>
              <TextButton
                enabled={!dismissAction.disabled}
                onClick={() => handleAction(dismissAction)}
                colors={{contentColor: colors.onSurfaceVariant}}>
                <Text
                  color={String(colors.onSurfaceVariant)}
                  style={{typography: 'labelLarge', fontWeight: '700'}}>
                  {dismissAction.label}
                </Text>
              </TextButton>
            </AlertDialog.DismissButton>
          ) : null}
          {confirmAction ? (
            <AlertDialog.ConfirmButton>
              <TextButton
                enabled={!confirmAction.disabled}
                onClick={() => handleAction(confirmAction)}
                colors={{
                  contentColor:
                    confirmAction.variant === 'destructive'
                      ? colors.error
                      : colors.primary,
                }}>
                <Text
                  color={String(
                    confirmAction.variant === 'destructive'
                      ? colors.error
                      : colors.primary,
                  )}
                  style={{typography: 'labelLarge', fontWeight: '700'}}>
                  {confirmAction.label}
                </Text>
              </TextButton>
            </AlertDialog.ConfirmButton>
          ) : null}
        </AlertDialog>
      </Host>
    </View>
  );
};

export default AppDialog;
