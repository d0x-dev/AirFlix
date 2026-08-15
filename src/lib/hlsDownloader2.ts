import * as RNFS from '@dr.pogodin/react-native-fs';
import axios from 'axios';

interface SegmentInfo {
  duration: number;
  url: string;
  index: number;
}

interface M3U8Data {
  segments: SegmentInfo[];
  totalDuration: number;
  isLive: boolean;
}

const cancelledDownloads = new Set<string>();
const activeDownloads = new Set<string>();

const parseM3U8Playlist = async (
  url: string,
  headers: any = {},
): Promise<M3U8Data> => {
  try {
    console.log('Fetching M3U8 playlist:', url);
    const response = await axios.get(url, {
      headers,
      timeout: 10000,
    });

    const content = response.data;
    console.log('M3U8 content preview:', content.substring(0, 500));
    const lines = content.split('\n').map((line: string) => line.trim());

    const segments: SegmentInfo[] = [];
    let totalDuration = 0;
    let isLive = false;
    let segmentIndex = 0;

    const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);

    // Check if this is a master playlist (contains #EXT-X-STREAM-INF)
    const hasMasterPlaylist = lines.some((line: string) =>
      line.includes('#EXT-X-STREAM-INF'),
    );

    if (hasMasterPlaylist) {
      console.log(
        'Detected master playlist, looking for best quality stream...',
      );

      // Find the best quality stream URL
      let bestQualityUrl = null;
      let highestBandwidth = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes('#EXT-X-STREAM-INF')) {
          // Extract bandwidth
          const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
          const bandwidth = bandwidthMatch
            ? parseInt(bandwidthMatch[1], 10)
            : 0;

          // Get the next line which should be the playlist URL
          if (i + 1 < lines.length) {
            let playlistUrl = lines[i + 1];
            if (
              !playlistUrl.startsWith('http') &&
              !playlistUrl.startsWith('#')
            ) {
              playlistUrl = baseUrl + playlistUrl;
            }

            // Choose the highest bandwidth stream
            if (bandwidth > highestBandwidth) {
              highestBandwidth = bandwidth;
              bestQualityUrl = playlistUrl;
            }
          }
        }
      }

      if (bestQualityUrl) {
        console.log(
          'Found best quality stream:',
          bestQualityUrl,
          'with bandwidth:',
          highestBandwidth,
        );
        // Recursively parse the actual playlist
        return await parseM3U8Playlist(bestQualityUrl, headers);
      } else {
        throw new Error('No valid stream found in master playlist');
      }
    }

    // Parse regular playlist with segments
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes('#EXT-X-ENDLIST')) {
        isLive = false;
      } else if (line.includes('#EXTINF:')) {
        const durationMatch = line.match(/#EXTINF:([\d.]+)/);
        const duration = durationMatch ? parseFloat(durationMatch[1]) : 0;

        // Next line should be the segment URL
        if (i + 1 < lines.length) {
          let segmentUrl = lines[i + 1];

          // Skip lines that start with # (comments/metadata)
          if (segmentUrl.startsWith('#')) {
            continue;
          }

          if (!segmentUrl.startsWith('http')) {
            segmentUrl = baseUrl + segmentUrl;
          }

          segments.push({
            duration,
            url: segmentUrl,
            index: segmentIndex++,
          });

          totalDuration += duration;
        }
      }
    }

    console.log(
      `Parsed ${segments.length} segments, total duration: ${totalDuration}s`,
    );

    return {
      segments,
      totalDuration,
      isLive,
    };
  } catch (error) {
    console.error('Error parsing M3U8:', error);
    throw error;
  }
};

const downloadSegment = async (
  downloadId: string,
  segmentUrl: string,
  outputPath: string,
  headers: any = {},
): Promise<void> => {
  if (cancelledDownloads.has(downloadId)) {
    throw new Error('Download cancelled');
  }

  const download = RNFS.downloadFile({
    fromUrl: segmentUrl,
    toFile: outputPath,
    headers,
    background: false,
    discretionary: false,
    cacheable: false,
    progressDivider: 0,
    connectionTimeout: 30000,
    readTimeout: 30000,
  });

  await download.promise;
};

const mergeSegments = async (
  segmentPaths: string[],
  outputPath: string,
): Promise<void> => {
  let isFirstFile = true;

  for (const segmentPath of segmentPaths) {
    if (await RNFS.exists(segmentPath)) {
      if (isFirstFile) {
        await RNFS.copyFile(segmentPath, outputPath);
        isFirstFile = false;
      } else {
        const content = await RNFS.readFile(segmentPath, 'base64');
        await RNFS.appendFile(outputPath, content, 'base64');
      }

      // Clean up segment file
      await RNFS.unlink(segmentPath);
    }
  }
};

export const hlsDownloader2 = async ({
  videoUrl,
  downloadId,
  path,
  title,
  tempDirectory,
  onJobStarted,
  onProgress,
  onCompleted,
  headers = {},
}: {
  videoUrl: string;
  downloadId: string;
  path: string;
  title: string;
  tempDirectory?: string;
  onJobStarted?: (jobId: string) => void;
  onProgress?: (completedSegments: number, totalSegments: number) => void;
  onCompleted?: (outputPath: string) => void | Promise<void>;
  headers?: any;
}) => {
  cancelledDownloads.delete(downloadId);
  activeDownloads.add(downloadId);
  onJobStarted?.(downloadId);

  const tempDir = tempDirectory || `${RNFS.CachesDirectoryPath}/hls_segments`;

  try {
    // Ensure temp directory exists
    if (!(await RNFS.exists(tempDir))) {
      await RNFS.mkdir(tempDir);
    }

    // Parse the M3U8 playlist
    console.log('Parsing M3U8 playlist...');
    const m3u8Data = await parseM3U8Playlist(videoUrl, headers);

    if (m3u8Data.segments.length === 0) {
      throw new Error('No segments found in playlist');
    }

    console.log(
      `Found ${m3u8Data.segments.length} segments, total duration: ${m3u8Data.totalDuration}s`,
    );

    let downloadedSegments = 0;
    const segmentPaths: string[] = [];
    const maxConcurrentDownloads = 10; // Limit concurrent downloads

    // Download segments in batches
    for (let i = 0; i < m3u8Data.segments.length; i += maxConcurrentDownloads) {
      if (cancelledDownloads.has(downloadId)) {
        throw new Error('Download cancelled by user');
      }

      const batch = m3u8Data.segments.slice(i, i + maxConcurrentDownloads);
      const batchPromises = batch.map(async segment => {
        const segmentPath = `${tempDir}/segment_${segment.index}.ts`;
        segmentPaths[segment.index] = segmentPath;

        try {
          await downloadSegment(downloadId, segment.url, segmentPath, headers);
          downloadedSegments++;
          onProgress?.(downloadedSegments, m3u8Data.segments.length);

          const progress =
            (downloadedSegments / m3u8Data.segments.length) * 100;

          console.log(
            `Downloaded segment ${segment.index + 1}/${
              m3u8Data.segments.length
            } (${progress.toFixed(1)}%)`,
          );
        } catch (error) {
          console.error(`Failed to download segment ${segment.index}:`, error);
          throw error;
        }
      });

      await Promise.all(batchPromises);

      // Small delay between batches to avoid overwhelming the server
      if (i + maxConcurrentDownloads < m3u8Data.segments.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    if (cancelledDownloads.has(downloadId)) {
      throw new Error('Download cancelled by user');
    }

    // Merge all segments into final file
    console.log('Merging segments...');
    await mergeSegments(segmentPaths, path);

    // Clean up temp directory
    if (await RNFS.exists(tempDir)) {
      await RNFS.unlink(tempDir);
    }

    if (cancelledDownloads.has(downloadId)) {
      // Clean up the output file if cancelled during merge
      if (await RNFS.exists(path)) {
        await RNFS.unlink(path);
      }
      throw new Error('Download cancelled by user');
    }

    // Success
    console.log('Download completed successfully');
    await onCompleted?.(path);
  } catch (error) {
    console.error('HLS download failed:', error);

    const cancelled = cancelledDownloads.has(downloadId);

    if (await RNFS.exists(tempDir)) {
      await RNFS.unlink(tempDir);
    }

    if (await RNFS.exists(path)) {
      await RNFS.unlink(path);
    }

    const errorMessage = cancelled
      ? 'Download cancelled'
      : `Failed to download ${title}`;
    console.error(errorMessage);

    throw error;
  } finally {
    activeDownloads.delete(downloadId);
    cancelledDownloads.delete(downloadId);
  }
};

// Function to cancel ongoing download
export const cancelHlsDownload = (downloadId: string) => {
  if (activeDownloads.has(downloadId)) {
    cancelledDownloads.add(downloadId);
    console.log(`Cancelling HLS download: ${downloadId}`);
  }
};

// Check if a download is in progress
export const isHlsDownloadInProgress = (downloadId: string): boolean =>
  activeDownloads.has(downloadId) && !cancelledDownloads.has(downloadId);
