import type {
  Catalog,
  EpisodeLink,
  Info,
  Link,
  Post,
  Stream,
} from '../providers/types';
import {providerManager} from './ProviderManager';

type DiagnosticStage =
  | 'catalog'
  | 'posts'
  | 'metadata'
  | 'episodes'
  | 'streams';

export type ProviderDiagnosticProgressStage =
  | 'catalog'
  | 'posts'
  | 'metadata'
  | 'playback'
  | 'streams';

export type ProviderDiagnosticProgress = {
  stage: ProviderDiagnosticProgressStage;
  status: 'running' | 'completed' | 'failed';
  detail?: string;
};

export type ProviderDiagnosticProgressCallback = (
  progress: ProviderDiagnosticProgress,
) => void;

export type ProviderDiagnosticResult = {
  catalog: Catalog;
  post: Post;
  metadata: Info;
  episode?: EpisodeLink;
  directLink?: {title: string; link: string; type?: string};
  streams: Stream[];
};

export class ProviderDiagnosticError extends Error {
  constructor(
    public readonly stage: DiagnosticStage,
    message: string,
  ) {
    super(message);
    this.name = 'ProviderDiagnosticError';
  }
}

const pickRandom = <T>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)];

const requireItems = <T>(
  items: T[] | undefined,
  stage: DiagnosticStage,
  label: string,
): T[] => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ProviderDiagnosticError(stage, `Provider returned no ${label}`);
  }
  return items;
};

const getStageError = (stage: DiagnosticStage, error: unknown) => {
  if (error instanceof ProviderDiagnosticError) {
    return error;
  }
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error) || String(error);
  return new ProviderDiagnosticError(stage, message);
};

const runStage = async <T>(
  progressStage: ProviderDiagnosticProgressStage,
  errorStage: DiagnosticStage,
  onProgress: ProviderDiagnosticProgressCallback | undefined,
  operation: () => Promise<T> | T,
): Promise<T> => {
  onProgress?.({stage: progressStage, status: 'running'});
  try {
    const result = await operation();
    onProgress?.({stage: progressStage, status: 'completed'});
    return result;
  } catch (error) {
    const stageError = getStageError(errorStage, error);
    onProgress?.({
      stage: progressStage,
      status: 'failed',
      detail: stageError.message,
    });
    throw stageError;
  }
};

const getPlayableLink = async (
  metadata: Info,
  providerValue: string,
): Promise<{
  episode?: EpisodeLink;
  directLink?: {title: string; link: string; type?: string};
  link: string;
  type: string;
}> => {
  const links = requireItems<Link>(
    metadata.linkList,
    'metadata',
    'metadata playback links',
  );
  const episodeSeasons = links.filter(item => item?.episodesLink);

  if (episodeSeasons.length > 0) {
    const season = pickRandom(episodeSeasons);
    let episodes: EpisodeLink[];
    try {
      episodes = await providerManager.getEpisodes({
        url: season.episodesLink!,
        providerValue,
      });
    } catch (error) {
      throw getStageError('episodes', error);
    }
    const episode = pickRandom(requireItems(episodes, 'episodes', 'episodes'));
    return {episode, link: episode.link, type: 'series'};
  }

  const directLinks = links.flatMap(item => item.directLinks ?? []);
  const directLink = pickRandom(
    requireItems(directLinks, 'metadata', 'direct playback links'),
  );
  return {
    directLink,
    link: directLink.link,
    type: directLink.type ?? metadata.type ?? 'movie',
  };
};

export const testProvider = async (
  providerValue: string,
  onProgress?: ProviderDiagnosticProgressCallback,
): Promise<ProviderDiagnosticResult> => {
  const controller = new AbortController();

  const catalog = await runStage('catalog', 'catalog', onProgress, async () => {
    const catalogs = await providerManager.getCatalog({providerValue});
    return pickRandom(requireItems(catalogs, 'catalog', 'catalogs'));
  });

  const post = await runStage('posts', 'posts', onProgress, async () => {
    const posts = await providerManager.getPosts({
      filter: catalog.filter,
      page: 1,
      providerValue,
      signal: controller.signal,
    });
    return pickRandom(requireItems(posts, 'posts', 'posts'));
  });

  const metadata = await runStage(
    'metadata',
    'metadata',
    onProgress,
    async () => {
      const result = await providerManager.getMetaData({
        link: post.link,
        provider: providerValue,
      });
      if (!result || !result.title) {
        throw new ProviderDiagnosticError(
          'metadata',
          'Provider returned invalid metadata',
        );
      }
      return result;
    },
  );

  const playable = await runStage('playback', 'metadata', onProgress, () =>
    getPlayableLink(metadata, providerValue),
  );

  const streams = await runStage('streams', 'streams', onProgress, async () => {
    const result = await providerManager.getStream({
      link: playable.link,
      type: playable.type,
      signal: controller.signal,
      providerValue,
    });
    return requireItems(result, 'streams', 'streams');
  });

  return {
    catalog,
    post,
    metadata,
    episode: playable.episode,
    directLink: playable.directLink,
    streams,
  };
};
