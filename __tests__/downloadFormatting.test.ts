import {
  formatDownloadBytes,
  formatDownloadSpeed,
} from '../src/lib/downloadFormatting';

describe('download formatting', () => {
  it('formats byte values with readable units', () => {
    expect(formatDownloadBytes(0)).toBe('0 B');
    expect(formatDownloadBytes(1024)).toBe('1.0 KB');
    expect(formatDownloadBytes(15 * 1024 * 1024)).toBe('15 MB');
  });

  it('formats download speed', () => {
    expect(formatDownloadSpeed(2.5 * 1024 * 1024)).toBe('2.5 MB/s');
  });
});
