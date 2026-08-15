import React from 'react';
import renderer, {act} from 'react-test-renderer';
import IconButton from '../src/components/ui/IconButton';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const ReactModule = require('react');
  const {View} = require('react-native');

  return {
    __esModule: true,
    default: (props: object) => ReactModule.createElement(View, props),
  };
});

jest.mock('../src/theme/M3PaletteContext', () => ({
  useM3Colors: () => ({
    onSecondaryContainer: '#FFFFFF',
    onSurfaceVariant: '#AAAAAA',
    primary: '#FFFFFF',
    secondaryContainer: '#333333',
    surfaceContainerHigh: '#222222',
  }),
}));

describe('IconButton', () => {
  it('registers every press', async () => {
    const onPress = jest.fn();
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(
        <IconButton icon="plus" label="Increase" onPress={onPress} />,
      );
    });
    const pressable = tree!.root.findByProps({accessibilityLabel: 'Increase'});

    await act(async () => {
      pressable.props.onPress();
      pressable.props.onPress();
      pressable.props.onPress();
    });

    expect(onPress).toHaveBeenCalledTimes(3);
  });

  it('disables the press target', async () => {
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(
        <IconButton icon="minus" label="Decrease" disabled />,
      );
    });
    const pressable = tree!.root.findByProps({accessibilityLabel: 'Decrease'});

    expect(pressable.props.disabled).toBe(true);
    expect(pressable.props.accessibilityState.disabled).toBe(true);
  });

  it('uses a minimum 48dp touch target', async () => {
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(
        <IconButton icon="delete-outline" label="Clear cache" />,
      );
    });
    const pressable = tree!.root.findByProps({
      accessibilityLabel: 'Clear cache',
    });
    const style = pressable.props.style({pressed: false});

    expect(style.height).toBeGreaterThanOrEqual(48);
    expect(style.width).toBeGreaterThanOrEqual(48);
    expect(pressable.props.hitSlop).toBe(4);
  });
});
