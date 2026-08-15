import {describe, expect, it, jest} from '@jest/globals';
import React from 'react';
import renderer, {act} from 'react-test-renderer';

const mockBottomSheetProps = jest.fn();

jest.mock('@gorhom/bottom-sheet', () => {
  const ReactModule = require('react');
  const ReactNative = require('react-native');
  const BottomSheet = ReactModule.forwardRef(
    (props: Record<string, unknown>, ref: React.Ref<unknown>) => {
      mockBottomSheetProps(props);
      // Reproduce the library lifecycle window where the ref is populated but
      // its imperative close/expand methods have not been attached yet.
      ReactModule.useImperativeHandle(ref, () => ({}));
      return ReactModule.createElement(ReactNative.View, null, props.children);
    },
  );
  return {
    __esModule: true,
    default: BottomSheet,
    BottomSheetScrollView: ReactNative.ScrollView,
  };
});

jest.mock('react-native-gesture-handler', () => {
  const {View} = require('react-native');
  return {GestureHandlerRootView: View};
});

jest.mock('../src/components/Skeleton', () => {
  const {View} = require('react-native');
  return View;
});

jest.mock('react-native-haptic-feedback', () => ({trigger: jest.fn()}));

jest.mock('../src/lib/zustand/themeStore', () => ({
  __esModule: true,
  default: (selector: (state: {primary: string}) => unknown) =>
    selector({primary: '#ffffff'}),
}));

jest.mock('../src/lib/storage', () => ({
  settingsStorage: {isHapticFeedbackEnabled: () => false},
}));

jest.mock('react-native-video', () => ({
  TextTrackType: {VTT: 'text/vtt'},
}));

import DownloadBottomSheet from '../src/components/DownloadBottomSheet';

describe('DownloadBottomSheet', () => {
  it('keeps fixed snap points when no servers are found', () => {
    act(() => {
      renderer.create(
        <DownloadBottomSheet
          data={[]}
          loading={false}
          title="Streams"
          showModal={true}
          setModal={jest.fn()}
          onPressVideo={jest.fn()}
          onPressSubs={jest.fn()}
          error="No server found"
        />,
      );
    });

    expect(mockBottomSheetProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enableDynamicSizing: false,
        snapPoints: ['30%', 450],
      }),
    );
  });

  it('does not call a missing close method while mounted hidden', () => {
    expect(() => {
      act(() => {
        renderer.create(
          <DownloadBottomSheet
            data={[]}
            loading={false}
            title="Streams"
            showModal={false}
            setModal={jest.fn()}
            onPressVideo={jest.fn()}
            onPressSubs={jest.fn()}
          />,
        );
      });
    }).not.toThrow();
  });
});
