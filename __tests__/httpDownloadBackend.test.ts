const mockCleanupDownloadStaging = jest.fn(async () => undefined);
const mockUpdateDownload = jest.fn();
const mockUpdateProgress = jest.fn();
const mockDownloadAsync = jest.fn();
const mockPauseAsync = jest.fn();
const mockResumeAsync = jest.fn();
const mockCancel = jest.fn();
const mockRelease = jest.fn();

let mockTaskState = 'idle';
const mockTask = {
  get state() {
    return mockTaskState;
  },
  downloadAsync: mockDownloadAsync,
  pauseAsync: mockPauseAsync,
  resumeAsync: mockResumeAsync,
  cancel: mockCancel,
  release: mockRelease,
};
const mockCreateDownloadTask = jest.fn(() => mockTask);

jest.mock('expo-file-system', () => ({
  DownloadTask: class {},
  File: class MockFile {
    uri: string;

    static createDownloadTask(...args: unknown[]) {
      return mockCreateDownloadTask(...args);
    }

    constructor(mockUri: string) {
      this.uri = mockUri;
    }
  },
}));

jest.mock('../src/lib/downloadDestination', () => ({
  cleanupDownloadStaging: (...args: unknown[]) =>
    mockCleanupDownloadStaging(...args),
}));

jest.mock('../src/lib/zustand/downloadsStore', () => ({
  __esModule: true,
  default: {
    getState: () => ({
      updateDownload: mockUpdateDownload,
      updateProgress: mockUpdateProgress,
    }),
  },
}));

import {
  createDownloadProgressReporter,
  httpDownloadBackend,
} from '../src/lib/downloadBackends/httpBackend';
import {DownloadPauseSupportError} from '../src/lib/downloadBackends/types';

const context = {
  record: {
    id: 'download-1',
    url: 'https://example.com/video.mp4',
    headers: {},
  },
  destination: {
    stagingDirectory: '/cache/downloads/download-1',
    stagingPath: '/cache/downloads/download-1/video.mp4.part',
  },
} as never;

describe('HTTP download backend pause support', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTaskState = 'idle';
  });

  it('keeps start pending while paused and completes after resume', async () => {
    let finishPause: ((value: null) => void) | undefined;
    mockDownloadAsync.mockImplementation(
      () =>
        new Promise(resolve => {
          finishPause = resolve;
        }),
    );
    mockPauseAsync.mockImplementation(async () => {
      mockTaskState = 'paused';
      finishPause!(null);
    });
    mockResumeAsync.mockImplementation(async () => {
      mockTaskState = 'completed';
      return {uri: 'file:///cache/downloads/download-1/video.mp4.part'};
    });

    const startPromise = httpDownloadBackend.start(context);
    mockTaskState = 'active';
    await httpDownloadBackend.pause!('download-1');

    let completed = false;
    startPromise.then(() => {
      completed = true;
    });
    await Promise.resolve();
    expect(completed).toBe(false);

    await httpDownloadBackend.resume!('download-1');
    await startPromise;

    expect(mockResumeAsync).toHaveBeenCalledTimes(1);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('surfaces pause failures as unsupported pause errors', async () => {
    mockDownloadAsync.mockReturnValue(new Promise(() => undefined));
    mockTaskState = 'active';
    mockPauseAsync.mockRejectedValue(new Error('resume data unavailable'));
    httpDownloadBackend.start(context).catch(() => undefined);

    await expect(httpDownloadBackend.pause!('download-1')).rejects.toThrow(
      DownloadPauseSupportError,
    );

    await httpDownloadBackend.cancel('download-1');
  });
});

describe('HTTP download progress reporting', () => {
  it('uses the real sample duration instead of under-reporting fast downloads', () => {
    let currentTime = 0;
    const report = jest.fn();
    const onProgress = createDownloadProgressReporter(
      report,
      () => currentTime,
    );

    currentTime = 100;
    onProgress({bytesWritten: 2 * 1024 * 1024, totalBytes: 100 * 1024 * 1024});
    expect(report).not.toHaveBeenCalled();

    currentTime = 500;
    onProgress({
      bytesWritten: 10 * 1024 * 1024,
      totalBytes: 100 * 1024 * 1024,
    });

    expect(report).toHaveBeenCalledWith(
      10 * 1024 * 1024,
      100 * 1024 * 1024,
      20 * 1024 * 1024,
    );
  });

  it('always publishes the final sample even inside the throttle window', () => {
    let currentTime = 0;
    const report = jest.fn();
    const onProgress = createDownloadProgressReporter(
      report,
      () => currentTime,
    );

    currentTime = 200;
    onProgress({bytesWritten: 4 * 1024, totalBytes: 4 * 1024});

    expect(report).toHaveBeenCalledTimes(1);
  });
});
