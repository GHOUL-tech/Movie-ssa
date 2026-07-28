import { Genre, MediaDetail, MediaItem, Season } from '../types';

const DIRECT_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1MWIzNzE3MWFkZWY4MGZlYTEyNDI4MGE5MjE5NWJjMCIsIm5iZiI6MTc4NTIyODY2NS41NTUsInN1YiI6IjZhNjg2ZDc5NWZhMjNiOTA2MDRmNjdhNiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Zszu95k02KQoyOzTfSvXtr7F5h2rpR1iYRo7jdm2nBc";

// Poster & Backdrop image helpers
export function getImageUrl(path: string | null, size: 'poster' | 'backdrop' | 'original' | 'avatar' = 'poster'): string {
  if (!path) {
    if (size === 'backdrop') {
      return 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=1200&auto=format&fit=crop';
    }
    return 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=600&auto=format&fit=crop';
  }
  
  const sizeMap = {
    poster: 'w500',
    backdrop: 'w1280',
    original: 'original',
    avatar: 'w185'
  };

  return `https://image.tmdb.org/t/p/${sizeMap[size]}${path}`;
}

async function fetchFromApi(endpoint: string, params: Record<string, string> = {}) {
  const queryString = new URLSearchParams(params).toString();
  const proxyUrl = `/api/tmdb/${endpoint}${queryString ? `?${queryString}` : ''}`;

  try {
    const res = await fetch(proxyUrl);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Proxy fetch failed, falling back to direct TMDB API:", e);
  }

  // Fallback to direct fetch
  const directUrl = `https://api.themoviedb.org/3/${endpoint}${queryString ? `?${queryString}` : ''}`;
  const directRes = await fetch(directUrl, {
    headers: {
      'Authorization': `Bearer ${DIRECT_TOKEN}`,
      'Accept': 'application/json'
    }
  });

  if (!directRes.ok) {
    throw new Error(`TMDB fetch error ${directRes.status}: ${await directRes.text()}`);
  }

  return await directRes.json();
}

export async function getTrending(mediaType: 'all' | 'movie' | 'tv' = 'all', timeWindow: 'day' | 'week' = 'week'): Promise<MediaItem[]> {
  const data = await fetchFromApi(`trending/${mediaType}/${timeWindow}`);
  return data.results || [];
}

export async function getPopularMovies(page = 1): Promise<MediaItem[]> {
  const data = await fetchFromApi('movie/popular', { page: page.toString() });
  return (data.results || []).map((item: any) => ({ ...item, media_type: 'movie' }));
}

export async function getPopularTV(page = 1): Promise<MediaItem[]> {
  const data = await fetchFromApi('tv/popular', { page: page.toString() });
  return (data.results || []).map((item: any) => ({ ...item, media_type: 'tv' }));
}

export async function getTopRatedMovies(page = 1): Promise<MediaItem[]> {
  const data = await fetchFromApi('movie/top_rated', { page: page.toString() });
  return (data.results || []).map((item: any) => ({ ...item, media_type: 'movie' }));
}

export async function getNowPlayingMovies(page = 1): Promise<MediaItem[]> {
  const data = await fetchFromApi('movie/now_playing', { page: page.toString() });
  return (data.results || []).map((item: any) => ({ ...item, media_type: 'movie' }));
}

export async function getUpcomingMovies(page = 1): Promise<MediaItem[]> {
  const data = await fetchFromApi('movie/upcoming', { page: page.toString() });
  return (data.results || []).map((item: any) => ({ ...item, media_type: 'movie' }));
}

export async function getGenres(mediaType: 'movie' | 'tv' = 'movie'): Promise<Genre[]> {
  const data = await fetchFromApi(`genre/${mediaType}/list`);
  return data.genres || [];
}

export async function discoverMedia(
  type: 'movie' | 'tv',
  filters: {
    genreId?: number;
    sortBy?: string;
    minRating?: number;
    year?: number;
    page?: number;
  } = {}
): Promise<{ results: MediaItem[]; totalPages: number }> {
  const params: Record<string, string> = {
    page: (filters.page || 1).toString(),
    sort_by: filters.sortBy || 'popularity.desc',
  };

  if (filters.genreId) {
    params.with_genres = filters.genreId.toString();
  }
  if (filters.minRating) {
    params['vote_average.gte'] = filters.minRating.toString();
  }
  if (filters.year) {
    if (type === 'movie') {
      params.primary_release_year = filters.year.toString();
    } else {
      params.first_air_date_year = filters.year.toString();
    }
  }

  const data = await fetchFromApi(`discover/${type}`, params);
  const results = (data.results || []).map((item: any) => ({ ...item, media_type: type }));
  return { results, totalPages: data.total_pages || 1 };
}

export async function searchMulti(query: string, page = 1): Promise<MediaItem[]> {
  if (!query.trim()) return [];
  const data = await fetchFromApi('search/multi', {
    query: query.trim(),
    page: page.toString(),
  });
  return (data.results || []).filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv');
}

export async function getMediaDetail(id: number, type: 'movie' | 'tv'): Promise<MediaDetail> {
  const data = await fetchFromApi(`${type}/${id}`, {
    append_to_response: 'credits,videos,similar,recommendations',
  });
  return { ...data, media_type: type };
}

export async function getSeasonDetail(tvId: number, seasonNumber: number): Promise<Season> {
  const data = await fetchFromApi(`tv/${tvId}/season/${seasonNumber}`);
  return data;
}

// Map common genre IDs for display when full genres object is missing
export const GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};
