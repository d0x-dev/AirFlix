import {beforeEach, describe, expect, it, jest} from '@jest/globals';

jest.mock('../src/lib/services/ProviderManager', () => ({
  providerManager: {
    getCatalog: jest.fn(),
    getPosts: jest.fn(),
    getMetaData: jest.fn(),
    getEpisodes: jest.fn(),
    getStream: jest.fn(),
  },
}));

import {providerManager} from '../src/lib/services/ProviderManager';
import {
  ProviderDiagnosticError,
  testProvider,
} from '../src/lib/services/providerDiagnostics';

const mockManager = providerManager as jest.Mocked<typeof providerManager>;

const catalog = {title: 'Popular', filter: 'popular'};
const post = {title: 'Random Show', link: '/show/1', image: 'poster.jpg'};
const streams = [
  {server: 'Primary', link: 'https://video.test/1', type: 'mp4'},
];

describe('provider diagnostics', () => {
  beforeEach(() => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    mockManager.getCatalog.mockReset();
    mockManager.getPosts.mockReset();
    mockManager.getMetaData.mockReset();
    mockManager.getEpisodes.mockReset();
    mockManager.getStream.mockReset();
    mockManager.getCatalog.mockResolvedValue([catalog]);
    mockManager.getPosts.mockResolvedValue([post]);
    mockManager.getStream.mockResolvedValue(streams);
  });

  it('tests catalog, post, metadata, episodes, and streams for series', async () => {
    const episode = {title: 'Episode 1', link: '/episode/1'};
    mockManager.getMetaData.mockResolvedValue({
      title: 'Random Show',
      image: 'poster.jpg',
      synopsis: '',
      imdbId: '',
      type: 'series',
      linkList: [{title: 'Season 1', episodesLink: '/season/1'}],
    });
    mockManager.getEpisodes.mockResolvedValue([episode]);

    await expect(testProvider('fixture')).resolves.toEqual({
      catalog,
      post,
      metadata: expect.objectContaining({title: 'Random Show'}),
      episode,
      directLink: undefined,
      streams,
    });
    expect(mockManager.getStream).toHaveBeenCalledWith(
      expect.objectContaining({
        link: '/episode/1',
        type: 'series',
        providerValue: 'fixture',
      }),
    );
  });

  it('reports each stage as running and completed in order', async () => {
    mockManager.getMetaData.mockResolvedValue({
      title: 'Random Movie',
      image: 'poster.jpg',
      synopsis: '',
      imdbId: '',
      type: 'movie',
      linkList: [
        {
          title: 'Movie',
          directLinks: [{title: 'Play', link: '/movie/1', type: 'movie'}],
        },
      ],
    });
    const onProgress = jest.fn();

    await testProvider('fixture', onProgress);

    expect(onProgress.mock.calls.map(([progress]) => progress)).toEqual(
      ['catalog', 'posts', 'metadata', 'playback', 'streams'].flatMap(stage => [
        {stage, status: 'running'},
        {stage, status: 'completed'},
      ]),
    );
  });

  it('tests direct links without calling episodes', async () => {
    const directLink = {
      title: 'Play',
      link: '/movie/1',
      type: 'movie' as const,
    };
    mockManager.getMetaData.mockResolvedValue({
      title: 'Random Movie',
      image: 'poster.jpg',
      synopsis: '',
      imdbId: '',
      type: 'movie',
      linkList: [{title: 'Movie', directLinks: [directLink]}],
    });

    const result = await testProvider('fixture');

    expect(result.directLink).toEqual(directLink);
    expect(result.episode).toBeUndefined();
    expect(mockManager.getEpisodes).not.toHaveBeenCalled();
    expect(mockManager.getStream).toHaveBeenCalledWith(
      expect.objectContaining({link: '/movie/1', type: 'movie'}),
    );
  });

  it('reports the exact failed stage and provider error', async () => {
    mockManager.getPosts.mockRejectedValue(
      new Error('fixture getPosts failed: HTTP 503 Service Unavailable'),
    );

    await expect(testProvider('fixture')).rejects.toMatchObject({
      name: 'ProviderDiagnosticError',
      stage: 'posts',
      message: 'fixture getPosts failed: HTTP 503 Service Unavailable',
    } satisfies Partial<ProviderDiagnosticError>);
  });

  it('reports a failed progress state with the provider error', async () => {
    mockManager.getPosts.mockRejectedValue(new Error('HTTP 503'));
    const onProgress = jest.fn();

    await expect(testProvider('fixture', onProgress)).rejects.toBeInstanceOf(
      ProviderDiagnosticError,
    );

    expect(onProgress).toHaveBeenLastCalledWith({
      stage: 'posts',
      status: 'failed',
      detail: 'HTTP 503',
    });
  });
});
