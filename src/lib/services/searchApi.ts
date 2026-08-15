export interface SearchSuggestion {
  id: number;
  title: string;
  year: string;
  type: 'movie' | 'series';
  poster: string | null;
}

const TMDB_API_KEY = '426a40c5472a731b577da9abc723b103';
const BASE_URL = 'https://api.themoviedb.org/3';

export const fetchSearchSuggestions = async (query: string): Promise<SearchSuggestion[]> => {
  if (!query) {
    return [];
  }

  try {
    const response = await fetch(
      `${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`
    );
    const data = await response.json();
    
    if (data && data.results) {
      return data.results
        .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
        .map((item: any) => ({
          id: item.id,
          title: item.title || item.name,
          year: (item.release_date || item.first_air_date || '').split('-')[0],
          type: item.media_type === 'tv' ? 'series' : 'movie',
          poster: item.poster_path ? 'https://image.tmdb.org/t/p/w154' + item.poster_path : null,
        }));
    }
    return [];
  } catch (error) {
    console.error('TMDB search error:', error);
    return [];
  }
};
