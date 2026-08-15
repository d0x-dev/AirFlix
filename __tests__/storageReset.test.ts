const mockClearDefaultStore = jest.fn();
const mockClearCacheStore = jest.fn();

jest.mock('react-native-mmkv-storage', () => ({
  MMKVLoader: class {
    private instanceId = 'default';

    withInstanceID(instanceId: string) {
      this.instanceId = instanceId;
      return this;
    }

    initialize() {
      const instanceId = this.instanceId;
      return {
        clearStore: () => {
          if (instanceId === 'cache') {
            mockClearCacheStore();
            return;
          }
          mockClearDefaultStore();
        },
        getBool: jest.fn(),
        getInt: jest.fn(),
        getString: jest.fn(),
        removeItem: jest.fn(),
        setBool: jest.fn(),
        setInt: jest.fn(),
        setString: jest.fn(),
      };
    }
  },
}));

import {clearAllMMKVStorage} from '../src/lib/storage/StorageService';

describe('clearAllMMKVStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears the default and cache MMKV instances', () => {
    clearAllMMKVStorage();

    expect(mockClearDefaultStore).toHaveBeenCalledTimes(1);
    expect(mockClearCacheStore).toHaveBeenCalledTimes(1);
  });
});
