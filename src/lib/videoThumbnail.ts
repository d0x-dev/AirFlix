import {NativeModules, Platform} from 'react-native';

export type VideoThumbnailHeaders = Record<string, string>;

export type VideoThumbnailOptions = {
  /** JPEG output quality. Defaults to 85. */
  quality?: number;
  /** Downscale to fit this width while preserving the aspect ratio. */
  maxWidth?: number;
  /** Downscale to fit this height while preserving the aspect ratio. */
  maxHeight?: number;
  /** Reuse an identical thumbnail from the native cache. Defaults to true. */
  cache?: boolean;
};

export type VideoThumbnailResult = {
  uri: string;
  path: string;
  width: number;
  height: number;
  timestampMs: number;
  cached: boolean;
};

type VideoThumbnailNativeModule = {
  getThumbnail(
    source: string,
    timestampMs: number,
    headers: VideoThumbnailHeaders,
    options: VideoThumbnailOptions,
  ): Promise<VideoThumbnailResult>;
  clearCache(): Promise<void>;
};

const nativeModule = NativeModules.VideoThumbnailModule as
  | VideoThumbnailNativeModule
  | undefined;

function requireModule(): VideoThumbnailNativeModule {
  if (Platform.OS !== 'android') {
    throw new Error('Native video thumbnails are currently supported on Android only.');
  }
  if (!nativeModule) {
    throw new Error(
      'VideoThumbnailModule is unavailable. Rebuild the native app after running Expo prebuild.',
    );
  }
  return nativeModule;
}

/**
 * Extract a JPEG frame from an HTTP(S), HLS, content://, file://, or raw local path.
 * Remote requests receive every header supplied in `headers`.
 */
export function getVideoThumbnail(
  source: string,
  timestampMs: number,
  headers: VideoThumbnailHeaders = {},
  options: VideoThumbnailOptions = {},
): Promise<VideoThumbnailResult> {
  return requireModule().getThumbnail(source, timestampMs, headers, options);
}

export function clearVideoThumbnailCache(): Promise<void> {
  return requireModule().clearCache();
}
