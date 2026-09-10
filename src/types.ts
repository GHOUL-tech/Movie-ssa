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
  backendProvider?: 'hatchable' | 'firebase';
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
