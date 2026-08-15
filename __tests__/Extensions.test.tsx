import React from 'react';
import renderer, {act} from 'react-test-renderer';
import Extensions from '../src/screens/settings/Extensions';
import {ProviderDiagnosticError} from '../src/lib/services/providerDiagnostics';

const existingProvider = {
  value: 'existing',
  display_name: 'Existing',
  source: {author: 'fixture', url: 'https://example.test/fixture'},
  version: '1.0',
  icon: '',
  disabled: false,
  type: 'global' as const,
  installed: true,
};

const newProvider = {
  value: 'slow-provider',
  display_name: 'Slow Provider',
  source: {author: 'fixture', url: 'https://example.test/fixture'},
  version: '1.3',
  icon: '',
  disabled: false,
  type: 'english' as const,
  installed: false,
};

const alternateSourceProvider = {
  ...existingProvider,
  source: {author: 'alternate', url: 'https://example.test/alternate'},
  installed: false,
};

const secondProvider = {
  ...newProvider,
  value: 'second-provider',
  display_name: 'Second Provider',
};

let mockActiveProvider = existingProvider;
let mockInstalledProviders = [existingProvider];
let mockAvailableProviders = [newProvider];
const mockSetProvider = jest.fn();
const mockSetInstalledProviders = jest.fn();
const mockSetAvailableProviders = jest.fn();
const mockInstallProvider = jest.fn();
const mockTestProvider = jest.fn();
const mockUninstallProvider = jest.fn();

jest.mock('../src/lib/zustand/themeStore', () => ({
  __esModule: true,
  default: (selector: (state: {primary: string}) => unknown) =>
    selector({primary: '#ff6b57'}),
}));

jest.mock('../src/lib/zustand/contentStore', () => {
  const store = (selector: (state: unknown) => unknown) =>
    selector(store.getState());
  store.getState = () => ({
    provider: mockActiveProvider,
    setProvider: mockSetProvider,
    installedProviders: mockInstalledProviders,
    availableProviders: mockAvailableProviders,
    setInstalledProviders: mockSetInstalledProviders,
    setAvailableProviders: mockSetAvailableProviders,
  });
  return {__esModule: true, default: store};
});

jest.mock('../src/lib/storage/extensionStorage', () => ({
  extensionStorage: {
    getProviderSource: jest.fn(() => ({
      author: 'fixture',
      url: 'https://example.test/fixture',
    })),
    getInstalledProviders: jest.fn(() => mockInstalledProviders),
    getAvailableProviders: jest.fn(() => mockAvailableProviders),
    isProviderInstalled: jest.fn(() => false),
    uninstallProvider: (...args: unknown[]) => mockUninstallProvider(...args),
  },
}));

jest.mock('../src/lib/services/ExtensionManager', () => ({
  extensionManager: {
    initialize: jest.fn(async () => undefined),
    installProvider: (...args: unknown[]) => mockInstallProvider(...args),
  },
}));

jest.mock('../src/lib/services/UpdateProviders', () => ({
  updateProvidersService: {
    checkForUpdatesManual: jest.fn(async () => []),
  },
}));

jest.mock('../src/lib/services/providerDiagnostics', () => {
  class MockProviderDiagnosticError extends Error {
    stage: string;

    constructor(mockStage: string, message: string) {
      super(message);
      this.name = 'ProviderDiagnosticError';
      this.stage = mockStage;
    }
  }
  return {
    ProviderDiagnosticError: MockProviderDiagnosticError,
    testProvider: (...args: unknown[]) => mockTestProvider(...args),
  };
});

jest.mock('../src/lib/storage', () => ({
  settingsStorage: {
    isHapticFeedbackEnabled: jest.fn(() => false),
  },
}));

jest.mock('../src/screens/settings/components/ProviderSourceManager', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../src/components/RenderProviderFLagIcon', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: () => null,
  Feather: () => null,
  FontAwesome6: () => null,
  MaterialIcons: () => null,
}));

jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

describe('Extensions provider installation', () => {
  let tree: renderer.ReactTestRenderer | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    mockActiveProvider = existingProvider;
    mockInstalledProviders = [existingProvider];
    mockAvailableProviders = [newProvider];
    mockSetProvider.mockClear();
    mockSetProvider.mockImplementation(provider => {
      mockActiveProvider = provider;
    });
    mockSetInstalledProviders.mockClear();
    mockSetAvailableProviders.mockClear();
    mockInstallProvider.mockReset();
    mockTestProvider.mockReset();
    mockUninstallProvider.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    act(() => {
      tree?.unmount();
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('keeps the current provider active after installing another provider', async () => {
    mockInstallProvider.mockImplementation(async () => {
      mockInstalledProviders = [
        existingProvider,
        {...newProvider, installed: true},
      ];
    });

    await act(async () => {
      tree = renderer.create(
        <Extensions
          navigation={{navigate: jest.fn()} as never}
          route={{} as never}
        />,
      );
    });

    await act(async () => {
      await tree!.root
        .findByProps({testID: 'install-provider-fixture:slow-provider'})
        .props.onPress();
    });

    expect(mockInstallProvider).toHaveBeenCalledWith(newProvider);
    expect(mockSetInstalledProviders).toHaveBeenCalledWith(
      mockInstalledProviders,
    );
    expect(mockSetProvider).not.toHaveBeenCalled();
  });

  it('does not change the active provider when installation fails', async () => {
    mockInstallProvider.mockRejectedValue(new Error('fixture download failed'));

    await act(async () => {
      tree = renderer.create(
        <Extensions
          navigation={{navigate: jest.fn()} as never}
          route={{} as never}
        />,
      );
    });

    await act(async () => {
      await tree!.root
        .findByProps({testID: 'install-provider-fixture:slow-provider'})
        .props.onPress();
    });

    expect(mockSetProvider).not.toHaveBeenCalled();
    expect(
      tree!.root.findByProps({testID: 'app-dialog-title'}).props.children,
    ).toBe('Error');
    expect(
      tree!.root.findByProps({testID: 'app-dialog-message'}).props.children,
    ).toBe('Failed to install provider. Please try again.');
  });

  it('activates the first provider installed during initial setup', async () => {
    mockActiveProvider = {...existingProvider, value: '', display_name: ''};
    mockInstalledProviders = [];
    mockInstallProvider.mockImplementation(async () => {
      mockInstalledProviders = [{...newProvider, installed: true}];
    });

    await act(async () => {
      tree = renderer.create(
        <Extensions
          navigation={{navigate: jest.fn()} as never}
          route={{} as never}
        />,
      );
    });

    await act(async () => {
      await tree!.root
        .findByProps({testID: 'install-provider-fixture:slow-provider'})
        .props.onPress();
    });

    expect(mockSetProvider).toHaveBeenCalledWith(newProvider);
  });

  it('replaces an active provider that is no longer installed', async () => {
    mockInstalledProviders = [];
    mockInstallProvider.mockImplementation(async () => {
      mockInstalledProviders = [{...newProvider, installed: true}];
    });

    await act(async () => {
      tree = renderer.create(
        <Extensions
          navigation={{navigate: jest.fn()} as never}
          route={{} as never}
        />,
      );
    });

    await act(async () => {
      await tree!.root
        .findByProps({testID: 'install-provider-fixture:slow-provider'})
        .props.onPress();
    });

    expect(mockSetProvider).toHaveBeenCalledWith(newProvider);
  });

  it('updates provider source identity for a same-value install', async () => {
    mockAvailableProviders = [alternateSourceProvider];
    mockInstallProvider.mockImplementation(async () => {
      mockInstalledProviders = [
        existingProvider,
        {...alternateSourceProvider, installed: true},
      ];
    });

    await act(async () => {
      tree = renderer.create(
        <Extensions
          navigation={{navigate: jest.fn()} as never}
          route={{} as never}
        />,
      );
    });

    await act(async () => {
      await tree!.root
        .findByProps({testID: 'install-provider-alternate:existing'})
        .props.onPress();
    });

    expect(mockSetProvider).toHaveBeenCalledWith(alternateSourceProvider);
  });

  it('does not let a later concurrent install replace the first active provider', async () => {
    mockActiveProvider = {...existingProvider, value: '', display_name: ''};
    mockInstalledProviders = [];
    mockAvailableProviders = [newProvider, secondProvider];

    let finishFirstInstall: (() => void) | undefined;
    let finishSecondInstall: (() => void) | undefined;
    mockInstallProvider.mockImplementation(
      provider =>
        new Promise<void>(resolve => {
          const finishInstall = () => {
            mockInstalledProviders = [
              ...mockInstalledProviders,
              {...provider, installed: true},
            ];
            resolve();
          };
          if (provider.value === newProvider.value) {
            finishFirstInstall = finishInstall;
          } else {
            finishSecondInstall = finishInstall;
          }
        }),
    );

    await act(async () => {
      tree = renderer.create(
        <Extensions
          navigation={{navigate: jest.fn()} as never}
          route={{} as never}
        />,
      );
    });

    let firstInstall: Promise<void>;
    let secondInstall: Promise<void>;
    act(() => {
      firstInstall = tree!.root
        .findByProps({testID: 'install-provider-fixture:slow-provider'})
        .props.onPress();
      secondInstall = tree!.root
        .findByProps({testID: 'install-provider-fixture:second-provider'})
        .props.onPress();
    });

    await act(async () => {
      finishFirstInstall!();
      await firstInstall!;
    });
    await act(async () => {
      finishSecondInstall!();
      await secondInstall!;
    });

    expect(mockSetProvider).toHaveBeenCalledTimes(1);
    expect(mockSetProvider).toHaveBeenCalledWith(newProvider);
  });

  it('shows a success summary after testing an installed provider', async () => {
    mockTestProvider.mockImplementation(async (_provider, onProgress) => {
      for (const stage of [
        'catalog',
        'posts',
        'metadata',
        'playback',
        'streams',
      ]) {
        onProgress({stage, status: 'running'});
        onProgress({stage, status: 'completed'});
      }
      return {
        catalog: {title: 'Popular', filter: 'popular'},
        post: {title: 'Random Show', link: '/show/1', image: 'poster.jpg'},
        metadata: {title: 'Random Show'},
        episode: {title: 'Episode 1', link: '/episode/1'},
        streams: [{server: 'Primary', link: 'https://video.test/1'}],
      };
    });

    await act(async () => {
      tree = renderer.create(
        <Extensions
          navigation={{navigate: jest.fn()} as never}
          route={{} as never}
        />,
      );
    });

    await act(async () => {
      await tree!.root
        .findByProps({testID: 'test-provider-fixture:existing'})
        .props.onPress();
    });

    expect(mockTestProvider).toHaveBeenCalledWith(
      'existing',
      expect.any(Function),
    );
    for (const stage of [
      'catalog',
      'posts',
      'metadata',
      'playback',
      'streams',
    ]) {
      expect(
        tree!.root.findByProps({
          testID: `provider-test-step-${stage}-completed`,
        }),
      ).toBeDefined();
    }
    expect(
      tree!.root.findByProps({testID: 'provider-test-result'}).props.children,
    ).toContain('Streams: 1');
    expect(
      tree!.root.findByProps({
        testID: 'provider-status-fixture:existing-working',
      }),
    ).toBeDefined();
  });

  it('shows the failed stage and provider error', async () => {
    mockTestProvider.mockImplementation(async (_provider, onProgress) => {
      for (const stage of ['catalog', 'posts', 'metadata', 'playback']) {
        onProgress({stage, status: 'running'});
        onProgress({stage, status: 'completed'});
      }
      onProgress({stage: 'streams', status: 'running'});
      onProgress({
        stage: 'streams',
        status: 'failed',
        detail: 'HTTP 503 Service Unavailable',
      });
      throw new ProviderDiagnosticError(
        'streams' as never,
        'HTTP 503 Service Unavailable',
      );
    });

    await act(async () => {
      tree = renderer.create(
        <Extensions
          navigation={{navigate: jest.fn()} as never}
          route={{} as never}
        />,
      );
    });

    await act(async () => {
      await tree!.root
        .findByProps({testID: 'test-provider-fixture:existing'})
        .props.onPress();
    });

    expect(
      tree!.root.findByProps({
        testID: 'provider-test-step-streams-failed',
      }),
    ).toBeDefined();
    const message = tree!.root.findByProps({
      testID: 'provider-test-result',
    }).props.children;
    expect(message).toContain('Stage: streams');
    expect(message).toContain('HTTP 503 Service Unavailable');
    expect(
      tree!.root.findByProps({
        testID: 'provider-status-fixture:existing-failed',
      }),
    ).toBeDefined();
  });

  it('confirms uninstall from the button beside provider test', async () => {
    await act(async () => {
      tree = renderer.create(
        <Extensions
          navigation={{navigate: jest.fn()} as never}
          route={{} as never}
        />,
      );
    });

    act(() => {
      tree!.root
        .findByProps({testID: 'uninstall-provider-fixture:existing'})
        .props.onPress();
    });

    expect(mockUninstallProvider).not.toHaveBeenCalled();
    expect(
      tree!.root.findByProps({testID: 'app-dialog-title'}).props.children,
    ).toBe('Uninstall Provider');

    act(() => {
      tree!.root
        .findByProps({testID: 'confirm-uninstall-existing'})
        .props.onPress();
    });

    expect(mockUninstallProvider).toHaveBeenCalledWith('existing', 'fixture');
  });
});
