import * as RNFS from '@dr.pogodin/react-native-fs';
import {cleanupDownloadStaging} from '../downloadDestination';
import {torrentManager} from '../torrentManager';
import useDownloadsStore from '../zustand/downloadsStore';
import type {DownloadBackend, DownloadBackendContext} from './types';

interface ActiveTorrent {
  infoHash?: string;
  cancelled: boolean;
}

const activeTorrents = new Map<string, ActiveTorrent>();
const wait = (milliseconds: number) =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

const waitForTorrent = async (
  downloadId: string,
  infoHash: string,
): Promise<void> => {
  while (true) {
    const active = activeTorrents.get(downloadId);
    if (!active || active.cancelled) {
      throw new Error('Download cancelled');
    }

    const stats = await torrentManager.getStats(infoHash);
    useDownloadsStore
      .getState()
      .updateProgress(
        downloadId,
        stats.totalDone || 0,
        stats.totalWanted || 0,
        stats.downloadRate || 0,
      );

    if (stats.progress >= 1) {
      return;
    }
    await wait(1000);
  }
};

export const torrentDownloadBackend: DownloadBackend = {
  async start({record, destination}: DownloadBackendContext): Promise<void> {
    activeTorrents.set(record.id, {cancelled: false});
    const addData = await torrentManager.addTorrent(record.url, {
      output_folder: destination.stagingDirectory,
      file_name: record.displayFileName?.replace(/\.[^.]+$/, '') || record.id,
    });

    const active = activeTorrents.get(record.id);
    if (!active || active.cancelled) {
      await torrentManager.deleteTorrent(addData.infoHash, true);
      throw new Error('Download cancelled');
    }

    active.infoHash = addData.infoHash;
    useDownloadsStore.getState().updateDownload(record.id, {
      backendJobId: addData.infoHash,
      status: 'downloading',
      canPause: true,
      canResume: false,
    });

    try {
      await waitForTorrent(record.id, addData.infoHash);
      const result = await torrentManager.completeTorrent(addData.infoHash);
      if (!result.outputPath || !(await RNFS.exists(result.outputPath))) {
        throw new Error('Torrent output file is missing');
      }
      if (result.outputPath !== destination.stagingPath) {
        if (await RNFS.exists(destination.stagingPath)) {
          await RNFS.unlink(destination.stagingPath);
        }
        await RNFS.moveFile(result.outputPath, destination.stagingPath);
      }
      await torrentManager.deleteTorrent(addData.infoHash, false);
    } finally {
      activeTorrents.delete(record.id);
    }
  },

  async pause(downloadId: string): Promise<void> {
    const active = activeTorrents.get(downloadId);
    if (!active?.infoHash) {
      throw new Error('Torrent download is not currently active');
    }
    await torrentManager.pauseTorrent(active.infoHash);
  },

  async resume(downloadId: string): Promise<void> {
    const active = activeTorrents.get(downloadId);
    if (!active?.infoHash) {
      throw new Error('Paused torrent cannot be resumed');
    }
    await torrentManager.resumeTorrent(active.infoHash);
  },

  async cancel(downloadId: string): Promise<void> {
    const active = activeTorrents.get(downloadId);
    if (!active) {
      return;
    }
    active.cancelled = true;
    if (active.infoHash) {
      await torrentManager.deleteTorrent(active.infoHash, true);
    }
    activeTorrents.delete(downloadId);
  },

  async cleanup(downloadId: string): Promise<void> {
    activeTorrents.delete(downloadId);
    await cleanupDownloadStaging(downloadId);
  },
};
