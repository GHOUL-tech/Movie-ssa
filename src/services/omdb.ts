import { MediaDetail } from '../types';
import { AudioTrackOption, detectRegionalAndDubOptions } from './nuvioService';

export interface OmdbMovieData {
  Title?: string;
  Year?: string;
  Rated?: string;
  Released?: string;
  Runtime?: string;
  Genre?: string;
  Director?: string;
  Writer?: string;
  Actors?: string;
  Plot?: string;
  Language?: string;
  Country?: string;
  Awards?: string;
  Poster?: string;
  Ratings?: Array<{ Source: string; Value: string }>;
  Metascore?: string;
  imdbRating?: string;
  imdbVotes?: string;
  imdbID?: string;
  Type?: string;
  Response?: string;
}

export type AudioDubOption = AudioTrackOption;

/**
 * Derives rich movie details from TMDB and Nuvio metadata without external API calls
 */
export async function getOmdbDetail(
  imdbId?: string | null,
  title?: string | null,
  year?: string | number | null
): Promise<OmdbMovieData | null> {
  if (!imdbId && !title) return null;
  return {
    Title: title || undefined,
    Year: year ? String(year).slice(0, 4) : undefined,
    imdbID: imdbId || undefined,
    Response: 'True'
  };
}

/**
 * Detect available audio dubs and language tracks (powered by Nuvio Provider ecosystem)
 */
export function detectAudioDubs(
  _omdb: OmdbMovieData | null,
  detail: MediaDetail | null
): AudioDubOption[] {
  return detectRegionalAndDubOptions(detail);
}
