import type {OMDBResult, OMDBResponse} from '../../types/omdb';

const OMDB_API_KEY = '7755307f';
const BASE_URL = 'https://www.omdbapi.com';

export const searchOMDB = async (query: string): Promise<OMDBResult[]> => {
  if (!query) {
    return [];
  }

  try {
    const [movieRes, seriesRes] = await Promise.all([
      fetch(`https://v3-cinemeta.strem.io/catalog/movie/top/search=${encodeURIComponent(query)}.json`),
      fetch(`https://v3-cinemeta.strem.io/catalog/series/top/search=${encodeURIComponent(query)}.json`)
    ]);

    let results: OMDBResult[] = [];

    if (movieRes.ok) {
      const movieData = await movieRes.json();
      if (movieData.metas) {
        results = results.concat(movieData.metas.map((m: any) => ({
          Title: m.name,
          Year: m.releaseInfo || m.year || '',
          imdbID: m.imdb_id || m.id,
          Type: 'movie',
          Poster: m.poster || ''
        })));
      }
    }

    if (seriesRes.ok) {
      const seriesData = await seriesRes.json();
      if (seriesData.metas) {
        results = results.concat(seriesData.metas.map((m: any) => ({
          Title: m.name,
          Year: m.releaseInfo || m.year || '',
          imdbID: m.imdb_id || m.id,
          Type: 'series',
          Poster: m.poster || ''
        })));
      }
    }

    // Sort results to mix movies and series based on relevance (simplistic mix)
    return results;
  } catch (error) {
    console.error('Cinemeta search error:', error);
    return [];
  }
};
