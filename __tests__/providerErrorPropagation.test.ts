import {beforeEach, describe, expect, it, jest} from '@jest/globals';

jest.mock('react-native', () => ({
  ToastAndroid: {LONG: 1, show: jest.fn()},
}));

jest.mock('../src/lib/providers/headers', () => ({headers: {}}));

jest.mock('../src/lib/services/ExtensionManager', () => ({
  extensionManager: {getProviderModules: jest.fn()},
}));

jest.mock('../src/lib/sandbox/sandboxBridge', () => ({
  sandboxBridge: {invoke: jest.fn()},
  setSandboxStateHandler: jest.fn(),
}));

import {extensionManager} from '../src/lib/services/ExtensionManager';
import {sandboxBridge} from '../src/lib/sandbox/sandboxBridge';
import {ProviderManager} from '../src/lib/services/ProviderManager';

const mockGetProviderModules = extensionManager.getProviderModules as jest.Mock;
const mockInvoke = sandboxBridge.invoke as jest.Mock;

const detailedMessage =
  'anime-provider getCatalog failed: HTTP 429 Too Many Requests | ' +
  'URL https://example.com/catalog | Request failed with status code 429';

describe('ProviderManager error propagation', () => {
  beforeEach(() => {
    mockGetProviderModules.mockReset();
    mockInvoke.mockReset();
    mockGetProviderModules.mockReturnValue({
      modules: {catalog: 'exports.catalog = [];'},
    });
  });

  it('preserves detailed provider errors from catalog operations', async () => {
    mockInvoke.mockRejectedValue(new Error(detailedMessage));

    const manager = new ProviderManager();

    await expect(
      manager.getCatalog({providerValue: 'anime-provider'}),
    ).rejects.toThrow(detailedMessage);
  });

  it('preserves JSON details when the bridge rejects with a plain object', async () => {
    mockInvoke.mockRejectedValue({
      response: {status: 503},
      message: 'upstream unavailable',
    });

    const manager = new ProviderManager();

    await expect(
      manager.getGenres({providerValue: 'anime-provider'}),
    ).rejects.toThrow(
      '{"response":{"status":503},"message":"upstream unavailable"}',
    );
  });
});
