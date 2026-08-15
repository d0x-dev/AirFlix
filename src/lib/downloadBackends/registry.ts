import type {DownloadSourceType} from '../zustand/downloadsStore';
import {hlsDownloadBackend} from './hlsBackend';
import {httpDownloadBackend} from './httpBackend';
import {torrentDownloadBackend} from './torrentBackend';
import type {DownloadBackend} from './types';

const backends: Record<DownloadSourceType, DownloadBackend> = {
  http: httpDownloadBackend,
  hls: hlsDownloadBackend,
  torrent: torrentDownloadBackend,
};

export const getDownloadBackend = (
  sourceType: DownloadSourceType,
): DownloadBackend => backends[sourceType];
