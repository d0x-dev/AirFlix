import axios from 'axios';
import Constants from 'expo-constants';
import {useQuery} from '@tanstack/react-query';
import {settingsStorage} from '../storage';

export type TmdbMediaType = 'movie' | 'tv';

export interface TmdbStoryCastMember {
  id: number;
  name: string;
  character?: string;
  profilePath?: string;
}

export interface TmdbStoryCollectionItem {
  id: number;
  title: string;
  subtitle?: string;
  imagePath?: string;
}

export interface TmdbStoryData {
  id: number;
  mediaType: TmdbMediaType;
  title: string;
  tagline?: string;
  overview?: string;
  backdropPath?: string;
  backdropPaths: string[];
  posterPath?: string;
  trailerKey?: string;
  trailerName?: string;
  releaseDate?: string;
  runtime?: number;
  genres: string[];
  rating?: number;
  voteCount?: number;
  popularity?: number;
  trendingRank?: number;
  certification?: string;
  status?: string;
  originalLanguage?: string;
  cast: TmdbStoryCastMember[];
  creators: string[];
  companies: string[];
  countries: string[];
  networks: string[];
  keywords: string[];
  collectionTitle?: string;
  collectionItems: TmdbStoryCollectionItem[];
}

interface UseTmdbStoryOptions {
  enabled: boolean;
  imdbId?: string;
  tmdbId?: number | string;
  type?: string;
}

interface TmdbFindResult {
  id: number;
}

const TMDB_API_URL = 'https://api.themoviedb.org/3';

export const getTmdbApiKey = (): string =>
  '426a40c5472a731b577da9abc723b103';

const getPreferredMediaType = (type?: string): TmdbMediaType =>
  type?.toLowerCase() === 'series' || type?.toLowerCase() === 'tv'
    ? 'tv'
    : 'movie';

const getImagePath = (path?: string | null): string | undefined =>
  path || undefined;

const getMovieCertification = (details: any): string | undefined => {
  const releases = details.release_dates?.results ?? [];
  const country =
    releases.find((item: any) => item.iso_3166_1 === 'US') ?? releases[0];
  return country?.release_dates
    ?.find((item: any) => item.certification)
    ?.certification?.trim();
};

const getTvCertification = (details: any): string | undefined => {
  const ratings = details.content_ratings?.results ?? [];
  const country =
    ratings.find((item: any) => item.iso_3166_1 === 'US') ?? ratings[0];
  return country?.rating?.trim();
};

const resolveTmdbIdentity = async ({
  apiKey,
  imdbId,
  preferredType,
  signal,
  tmdbId,
}: {
  apiKey: string;
  imdbId?: string;
  preferredType: TmdbMediaType;
  signal?: AbortSignal;
  tmdbId?: number | string;
}): Promise<{id: number; mediaType: TmdbMediaType}> => {
  const directId = Number(tmdbId);
  if (Number.isFinite(directId) && directId > 0) {
    return {id: directId, mediaType: preferredType};
  }

  if (!imdbId) {
    throw new Error('No TMDB or IMDb identifier is available');
  }

  const response = await axios.get(`${TMDB_API_URL}/find/${imdbId}`, {
    params: {
      api_key: apiKey,
      external_source: 'imdb_id',
      language: 'en-US',
    },
    signal,
    timeout: 10000,
  });
  const preferredResults: TmdbFindResult[] =
    preferredType === 'tv'
      ? (response.data?.tv_results ?? [])
      : (response.data?.movie_results ?? []);
  const fallbackResults: TmdbFindResult[] =
    preferredType === 'tv'
      ? (response.data?.movie_results ?? [])
      : (response.data?.tv_results ?? []);
  const result = preferredResults[0] ?? fallbackResults[0];
  if (!result?.id) {
    throw new Error('TMDB could not match this IMDb identifier');
  }
  return {
    id: result.id,
    mediaType: preferredResults[0]
      ? preferredType
      : preferredType === 'tv'
        ? 'movie'
        : 'tv',
  };
};

const normalizeStoryData = ({
  collection,
  details,
  mediaType,
  trendingRank,
}: {
  collection?: any;
  details: any;
  mediaType: TmdbMediaType;
  trendingRank?: number;
}): TmdbStoryData => {
  const isTv = mediaType === 'tv';
  const creditData = isTv ? details.aggregate_credits : details.credits;
  const cast = (creditData?.cast ?? []).slice(0, 16).map(
    (person: any): TmdbStoryCastMember => ({
      id: person.id,
      name: person.name,
      character: isTv
        ? person.roles?.[0]?.character
        : person.character || undefined,
      profilePath: getImagePath(person.profile_path),
    }),
  );
  const crew = creditData?.crew ?? [];
  const directors = isTv
    ? (details.created_by ?? []).map((person: any) => person.name)
    : crew
        .filter((person: any) => person.job === 'Director')
        .map((person: any) => person.name);
  const keywordItems = isTv
    ? (details.keywords?.results ?? [])
    : (details.keywords?.keywords ?? []);
  const collectionItems: TmdbStoryCollectionItem[] = isTv
    ? (details.seasons ?? [])
        .filter((season: any) => season.season_number > 0)
        .map((season: any) => ({
          id: season.id,
          title: season.name,
          subtitle:
            season.episode_count != null
              ? `${season.episode_count} episodes`
              : undefined,
          imagePath: getImagePath(season.poster_path),
        }))
    : (collection?.parts ?? []).map((movie: any) => ({
        id: movie.id,
        title: movie.title,
        subtitle: movie.release_date?.slice(0, 4),
        imagePath: getImagePath(movie.poster_path),
      }));
  const backdropPaths = Array.from(
    new Set(
      [
        details.backdrop_path,
        ...(details.images?.backdrops ?? []).map(
          (image: any) => image.file_path,
        ),
      ].filter(Boolean),
    ),
  ).slice(0, 10) as string[];
  const youtubeVideos = (details.videos?.results ?? []).filter(
    (video: any) => video.site === 'YouTube' && video.key,
  );
  const trailer =
    youtubeVideos.find(
      (video: any) => video.type === 'Trailer' && video.official,
    ) ??
    youtubeVideos.find((video: any) => video.type === 'Trailer') ??
    youtubeVideos.find((video: any) => video.type === 'Teaser') ??
    youtubeVideos[0];

  return {
    id: details.id,
    mediaType,
    title: isTv ? details.name : details.title,
    tagline: details.tagline || undefined,
    overview: details.overview || undefined,
    backdropPath: getImagePath(details.backdrop_path),
    backdropPaths,
    posterPath: getImagePath(details.poster_path),
    trailerKey: trailer?.key,
    trailerName: trailer?.name,
    releaseDate: isTv ? details.first_air_date : details.release_date,
    runtime: isTv ? details.episode_run_time?.[0] : details.runtime,
    genres: (details.genres ?? []).map((genre: any) => genre.name),
    rating: details.vote_average || undefined,
    voteCount: details.vote_count || undefined,
    popularity: details.popularity || undefined,
    trendingRank,
    certification: isTv
      ? getTvCertification(details)
      : getMovieCertification(details),
    status: details.status || undefined,
    originalLanguage: details.original_language?.toUpperCase(),
    cast,
    creators: Array.from(new Set(directors)).slice(0, 5) as string[],
    companies: (details.production_companies ?? [])
      .map((company: any) => company.name)
      .slice(0, 6),
    countries: (details.production_countries ?? [])
      .map((country: any) => country.name)
      .slice(0, 5),
    networks: (details.networks ?? [])
      .map((network: any) => network.name)
      .slice(0, 5),
    keywords: keywordItems.map((item: any) => item.name).slice(0, 10),
    collectionTitle:
      collection?.name || details.belongs_to_collection?.name || undefined,
    collectionItems,
  };
};

const fetchTmdbStory = async ({
  imdbId,
  signal,
  tmdbId,
  type,
}: Omit<UseTmdbStoryOptions, 'enabled'> & {
  signal?: AbortSignal;
}): Promise<TmdbStoryData> => {
  const apiKey = getTmdbApiKey();
  if (!apiKey) {
    throw new Error('No TMDB API key is configured');
  }

  const identity = await resolveTmdbIdentity({
    apiKey,
    imdbId,
    preferredType: getPreferredMediaType(type),
    signal,
    tmdbId,
  });
  const appendToResponse =
    identity.mediaType === 'tv'
      ? 'aggregate_credits,content_ratings,keywords,external_ids,images,videos'
      : 'credits,release_dates,keywords,external_ids,images,videos';
  const detailsResponse = await axios.get(
    `${TMDB_API_URL}/${identity.mediaType}/${identity.id}`,
    {
      params: {
        api_key: apiKey,
        append_to_response: appendToResponse,
        include_image_language: 'en,null',
        language: 'en-US',
      },
      signal,
      timeout: 12000,
    },
  );
  const details = detailsResponse.data;
  const [trendingResult, collectionResult] = await Promise.allSettled([
    axios.get(`${TMDB_API_URL}/trending/${identity.mediaType}/week`, {
      params: {api_key: apiKey, language: 'en-US'},
      signal,
      timeout: 10000,
    }),
    details.belongs_to_collection?.id
      ? axios.get(
          `${TMDB_API_URL}/collection/${details.belongs_to_collection.id}`,
          {
            params: {api_key: apiKey, language: 'en-US'},
            signal,
            timeout: 10000,
          },
        )
      : Promise.resolve(undefined),
  ]);
  const trending =
    trendingResult.status === 'fulfilled'
      ? (trendingResult.value.data?.results ?? [])
      : [];
  const trendingIndex = trending.findIndex(
    (item: any) => item.id === details.id,
  );
  const collection =
    collectionResult.status === 'fulfilled'
      ? collectionResult.value?.data
      : undefined;

  return normalizeStoryData({
    collection,
    details,
    mediaType: identity.mediaType,
    trendingRank: trendingIndex >= 0 ? trendingIndex + 1 : undefined,
  });
};

export const useTmdbStory = ({
  enabled,
  imdbId,
  tmdbId,
  type,
}: UseTmdbStoryOptions) => {
  const apiKeyRevision = settingsStorage.getTmdbApiKeyRevision();

  return useQuery({
    queryKey: [
      'tmdbStory',
      tmdbId || '',
      imdbId || '',
      type || '',
      apiKeyRevision,
    ],
    queryFn: ({signal}) => fetchTmdbStory({imdbId, signal, tmdbId, type}),
    enabled: enabled && Boolean(tmdbId || imdbId),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
    retry: 1,
  });
};
