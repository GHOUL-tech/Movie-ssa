import { ContinueWatchingItem, MediaType, WatchlistItem } from '../types';

const WATCHLIST_KEY = 'cinescope_watchlist_v1';
const CONTINUE_WATCHING_KEY = 'cinescope_continue_watching_v1';
const PREFERRED_SERVER_KEY = 'cinescope_server_pref_v1';

export function getWatchlist(): WatchlistItem[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse watchlist:', e);
    return [];
  }
}

export function saveWatchlist(list: WatchlistItem[]): void {
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save watchlist:', e);
  }
}

export function toggleWatchlist(item: {
  id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
}): boolean {
  const current = getWatchlist();
  const index = current.findIndex(w => w.id === item.id && w.media_type === item.media_type);
  
  if (index >= 0) {
    current.splice(index, 1);
    saveWatchlist(current);
    return false; // removed
  } else {
    current.unshift({
      id: item.id,
      media_type: item.media_type,
      title: item.title,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      vote_average: item.vote_average,
      release_date: item.release_date,
      added_at: Date.now(),
      watched: false,
    });
    saveWatchlist(current);
    return true; // added
  }
}

export function isInWatchlist(id: number, mediaType: MediaType): boolean {
  const list = getWatchlist();
  return list.some(item => item.id === id && item.media_type === mediaType);
}

export function toggleWatchedStatus(id: number, mediaType: MediaType): void {
  const list = getWatchlist();
  const target = list.find(w => w.id === id && w.media_type === mediaType);
  if (target) {
    target.watched = !target.watched;
    saveWatchlist(list);
  }
}

// Continue watching helpers
export function getContinueWatching(): ContinueWatchingItem[] {
  try {
    const raw = localStorage.getItem(CONTINUE_WATCHING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveContinueWatching(item: Omit<ContinueWatchingItem, 'last_watched'>): void {
  try {
    const list = getContinueWatching();
    const existingIndex = list.findIndex(c => c.id === item.id && c.media_type === item.media_type);
    
    const updatedItem: ContinueWatchingItem = {
      ...item,
      last_watched: Date.now(),
    };

    if (existingIndex >= 0) {
      list.splice(existingIndex, 1);
    }
    
    list.unshift(updatedItem);
    // Keep max 20 items
    localStorage.setItem(CONTINUE_WATCHING_KEY, JSON.stringify(list.slice(0, 20)));
  } catch (e) {
    console.error('Failed to save continue watching:', e);
  }
}

export function removeContinueWatching(id: number, mediaType: MediaType): void {
  const list = getContinueWatching();
  const filtered = list.filter(c => !(c.id === id && c.media_type === mediaType));
  localStorage.setItem(CONTINUE_WATCHING_KEY, JSON.stringify(filtered));
}

// Preferred server
export function getPreferredServer(): string {
  return localStorage.getItem(PREFERRED_SERVER_KEY) || 'twoembed';
}

export function setPreferredServer(serverId: string): void {
  localStorage.setItem(PREFERRED_SERVER_KEY, serverId);
}
