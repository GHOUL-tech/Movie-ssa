export type MediaType = 'movie' | 'tv';

export interface Genre {
  id: number;
  name: string;
}

export interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  vote_count?: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: MediaType;
  genre_ids?: number[];
  popularity?: number;
  origin_country?: string[];
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  tagline?: string;
  status?: string;
  adult?: boolean;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
}

export interface VideoResult {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official?: boolean;
}

export interface Episode {
  id: number;
  name: string;
  episode_number: number;
  season_number: number;
  overview: string;
  still_path: string | null;
  air_date: string;
  vote_average: number;
  runtime?: number;
}

export interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  overview: string;
  poster_path: string | null;
  air_date: string;
  episodes?: Episode[];
}

export interface MediaDetail extends MediaItem {
  genres: Genre[];
  imdb_id?: string;
  external_ids?: {
    imdb_id?: string;
    [key: string]: any;
  };
  spoken_languages?: Array<{
    english_name: string;
    iso_639_1: string;
    name: string;
  }>;
  translations?: {
    translations?: Array<{
      iso_639_1: string;
      iso_3166_1: string;
      name: string;
      english_name: string;
      data?: any;
    }>;
  };
  credits?: {
    cast: CastMember[];
    crew: CrewMember[];
  };
  videos?: {
    results: VideoResult[];
  };
  similar?: {
    results: MediaItem[];
  };
  recommendations?: {
    results: MediaItem[];
  };
  seasons?: Season[];
}

export interface WatchlistItem {
  id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
  added_at: number;
  watched: boolean;
}

export interface ContinueWatchingItem {
  id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  season?: number;
  episode?: number;
  episode_title?: string;
  progress_percent?: number;
  last_watched: number;
}

export interface WatchHistoryItem {
  id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  watched_at: number;
  season?: number;
  episode?: number;
  episode_title?: string;
  progress_percent?: number;
}

export type SubscriptionTier = 'one_month' | 'permanent' | 'six_months' | 'one_year';

export interface UserSubscription {
  tier: SubscriptionTier;
  startDate: number;
  expiresAt: number | null; // null for permanent
  isPermanent: boolean;
  codeUsed?: string;
}

export interface SubscriptionCode {
  id: string;
  code: string;
  tier: SubscriptionTier;
  durationDays: number; // 30, 180, 365, or 0 (permanent)
  createdAt: number;
  isRedeemed: boolean;
  redeemedBy?: {
    userId: string;
    userName: string;
    userEmail: string;
  };
  redeemedAt?: number;
  note?: string;
}

export interface SystemSettings {
  subscriptionRequired: boolean;
  shopUrl: string;
  updatedAt: number;
  googleSheetsScriptUrl?: string;
  googleSheetsAutoBackup?: boolean;
  googleSheetsLastSync?: number;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  password?: string;
  avatar: string;
  age?: number;
  country?: string;
  isUnder18?: boolean;
  joinedAt: number;
  subscription?: UserSubscription;
  watchHistory: WatchHistoryItem[];
  watchLater: WatchlistItem[];
}

export interface SupportMessage {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  message: string;
  sender: 'user' | 'admin';
  createdAt: number;
  read: boolean;
}

export interface ServerOption {
  id: string;
  name: string;
  badge: string;
  quality: string;
  description: string;
}

export interface NuvioRepository {
  id: string;
  name: string;
  url: string;
  baseUrl: string;
  version: string;
  author: string;
  description: string;
  scrapersCount: number;
  status: 'ready' | 'loading' | 'error';
  enabled?: boolean;
}

export interface NuvioScraper {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  supportedTypes: string[];
  filename: string;
  formats?: string[];
  logo?: string;
  contentLanguage?: string[];
  repoId: string;
  repoName: string;
  fileUrl: string;
  enabled?: boolean;
}

export interface NuvioStream {
  id: string;
  name: string;
  title: string;
  url: string;
  quality: string;
  size?: string;
  providerId: string;
  providerName: string;
  repoName: string;
  format?: 'm3u8' | 'mp4' | 'mkv' | 'embed' | 'auto';
  isDirect?: boolean;
  headers?: Record<string, string>;
  subtitles?: Array<{ url: string; lang: string }>;
  behaviorHints?: any;
}
