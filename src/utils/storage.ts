import { ContinueWatchingItem, MediaType, WatchlistItem, WatchHistoryItem, User } from '../types';
import { DEFAULT_AVATAR, getInitialAvatar } from './avatars';
import { 
  saveUserToFirebase, 
  getUserFromFirebase, 
  syncWatchHistoryToFirebase, 
  syncWatchLaterToFirebase,
  deleteUserFromFirebase
} from '../services/firebase';

const WATCHLIST_KEY = 'cinescope_watchlist_v1';
const CONTINUE_WATCHING_KEY = 'cinescope_continue_watching_v1';
const PREFERRED_SERVER_KEY = 'cinescope_server_pref_v1';
const USERS_KEY = 'zinovis_users_v2';
const CURRENT_USER_ID_KEY = 'zinovis_current_user_id_v2';
const GUEST_HISTORY_KEY = 'zinovis_guest_history_v1';
const ADMIN_SESSION_KEY = 'zinovis_admin_auth_session';

// Seed demo user if no users exist
function getInitialUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse users:', e);
  }

  // Initial demo user
  const demoUser: User = {
    id: 'zinovis_vip',
    username: 'alex_cinephile',
    name: 'Alex Vance',
    email: 'alex@zinovis.tv',
    password: 'password123',
    avatar: DEFAULT_AVATAR,
    joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 30, // 30 days ago
    watchHistory: [
      {
        id: 533535,
        media_type: 'movie',
        title: 'Deadpool & Wolverine',
        poster_path: '/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
        backdrop_path: '/yDHYTjA3R0jFYba16jBB1jv8M9l.jpg',
        vote_average: 7.7,
        watched_at: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
        progress_percent: 100,
      },
      {
        id: 94605,
        media_type: 'tv',
        title: 'Arcane',
        poster_path: '/fqldrq26q7z9slTvo9232Q T6dG.jpg',
        backdrop_path: '/2meX1nMdScFOoV4370rqHWIObye.jpg',
        vote_average: 8.7,
        watched_at: Date.now() - 1000 * 60 * 60 * 28, // 1 day ago
        season: 2,
        episode: 3,
        episode_title: 'Finally Got the Name Right',
        progress_percent: 75,
      },
      {
        id: 693134,
        media_type: 'movie',
        title: 'Dune: Part Two',
        poster_path: '/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
        backdrop_path: '/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg',
        vote_average: 8.2,
        watched_at: Date.now() - 1000 * 60 * 60 * 72, // 3 days ago
        progress_percent: 100,
      }
    ],
    watchLater: [
      {
        id: 1022789,
        media_type: 'movie',
        title: 'Inside Out 2',
        poster_path: '/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
        backdrop_path: '/stKGOmbuwhL46k9As0Y8IrRa7wT.jpg',
        vote_average: 7.6,
        release_date: '2024-06-11',
        added_at: Date.now() - 1000 * 60 * 60 * 12,
        watched: false,
      },
      {
        id: 1184918,
        media_type: 'movie',
        title: 'The Wild Robot',
        poster_path: '/wTnV3PCVW5O92JMrFvvrRil3RsH.jpg',
        backdrop_path: '/417tYZ4XUyJr6UmJep4LKGxegQA.jpg',
        vote_average: 8.4,
        release_date: '2024-09-12',
        added_at: Date.now() - 1000 * 60 * 60 * 48,
        watched: false,
      }
    ],
  };

  const users = [demoUser];
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to seed demo user:', e);
  }
  return users;
}

export function getAllUsers(): User[] {
  return getInitialUsers();
}

export function saveUsers(users: User[]): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    const currentId = localStorage.getItem(CURRENT_USER_ID_KEY);
    if (currentId) {
      const current = users.find(u => u.id === currentId);
      if (current) {
        saveUserToFirebase(current).catch(err => console.error('Firebase save error:', err));
      }
    }
  } catch (e) {
    console.error('Failed to save users:', e);
  }
}

export function saveUsersLocally(users: User[]): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save users locally:', e);
  }
}

export function getCurrentUser(): User | null {
  try {
    const currentId = localStorage.getItem(CURRENT_USER_ID_KEY);
    if (!currentId) return null;
    const users = getAllUsers();
    return users.find(u => u.id === currentId) || null;
  } catch (e) {
    return null;
  }
}

export function setCurrentUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_ID_KEY, user.id);
      // Sync user's watchLater with global watchlist key
      saveWatchlist(user.watchLater || []);
      // Sync to Firebase backend
      saveUserToFirebase(user).catch(err => console.error('Firebase setCurrentUser error:', err));
    } else {
      localStorage.removeItem(CURRENT_USER_ID_KEY);
    }
  } catch (e) {
    console.error('Failed to set current user:', e);
  }
}

export function registerUser(params: {
  id?: string;
  username?: string;
  name: string;
  email: string;
  password?: string;
  age?: number;
  country?: string;
  isUnder18?: boolean;
  avatar?: string;
}): { success: boolean; user?: User; error?: string } {
  const users = getAllUsers();
  
  const rawName = params.name.trim();
  const rawEmail = params.email.trim().toLowerCase();
  const fallbackUsername = rawEmail.split('@')[0] || rawName.replace(/\s+/g, '_').toLowerCase();
  const cleanUsername = (params.username?.trim() || fallbackUsername).toLowerCase();
  const customId = (params.id?.trim() || cleanUsername || `usr_${Date.now().toString(36)}`).toLowerCase();
  const isUnder18 = params.isUnder18 !== undefined ? params.isUnder18 : (params.age !== undefined && params.age !== null ? Number(params.age) < 18 : false);
  const resolvedAvatar = params.avatar?.trim() || getInitialAvatar(rawName || cleanUsername);

  // Check if username, email, or id already taken locally
  const existing = users.find(
    u => u.username.toLowerCase() === cleanUsername || 
         u.email.toLowerCase() === rawEmail ||
         u.id.toLowerCase() === customId
  );

  if (existing) {
    if (existing.id.toLowerCase() === customId) {
      return { success: false, error: `Account ID "${customId}" is already taken.` };
    }
    if (existing.username.toLowerCase() === cleanUsername) {
      return { success: false, error: `Username "${cleanUsername}" is already taken.` };
    }
    return { success: false, error: `Email "${params.email}" is already registered.` };
  }

  // Import any existing guest watchlist into new account
  const guestWatchlist = getWatchlist();

  const newUser: User = {
    id: customId,
    username: cleanUsername,
    name: rawName || cleanUsername,
    email: rawEmail,
    password: params.password || 'password',
    avatar: resolvedAvatar,
    age: params.age !== undefined && params.age !== null ? Number(params.age) : undefined,
    country: params.country || 'Global',
    isUnder18,
    joinedAt: Date.now(),
    watchHistory: [],
    watchLater: guestWatchlist.length > 0 ? guestWatchlist : [],
  };

  users.push(newUser);
  saveUsers(users);
  setCurrentUser(newUser);

  // Background save to Firebase backend
  saveUserToFirebase(newUser).catch(err => console.error('Firebase register save error:', err));

  return { success: true, user: newUser };
}

export async function registerUserAsync(params: {
  id?: string;
  username?: string;
  name: string;
  email: string;
  password?: string;
  age?: number;
  country?: string;
  avatar?: string;
}): Promise<{ success: boolean; user?: User; error?: string }> {
  const rawEmail = params.email.trim().toLowerCase();
  const rawName = params.name.trim();
  const fallbackUsername = rawEmail.split('@')[0] || rawName.replace(/\s+/g, '_').toLowerCase();
  const cleanUsername = (params.username?.trim() || fallbackUsername).toLowerCase();
  const customId = (params.id?.trim() || cleanUsername || `usr_${Date.now().toString(36)}`).toLowerCase();

  // Check Firebase first for existing user
  try {
    const existingRemote = await getUserFromFirebase(customId);
    if (existingRemote) {
      return { success: false, error: `Account ID "${customId}" is already registered in Firebase.` };
    }
  } catch (err) {
    console.warn('Firebase pre-check failed, continuing with registration:', err);
  }

  return registerUser(params);
}


export function loginUser(
  identifier: string,
  password?: string
): { success: boolean; user?: User; error?: string } {
  const users = getAllUsers();
  const clean = identifier.trim().toLowerCase();

  const found = users.find(
    u => u.id.toLowerCase() === clean || 
         u.username.toLowerCase() === clean || 
         u.email.toLowerCase() === clean
  );

  if (!found) {
    return { success: false, error: 'User not found locally. Searching Firebase backend...' };
  }

  if (password && found.password && found.password !== password) {
    return { success: false, error: 'Incorrect password. Please try again.' };
  }

  setCurrentUser(found);
  return { success: true, user: found };
}

export async function loginUserAsync(
  identifier: string,
  password?: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  const clean = identifier.trim().toLowerCase();

  // 1. Try local users first
  const users = getAllUsers();
  const found = users.find(
    u => u.id.toLowerCase() === clean || 
         u.username.toLowerCase() === clean || 
         u.email.toLowerCase() === clean
  );

  if (found) {
    if (password && found.password && found.password !== password) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }
    setCurrentUser(found);
    return { success: true, user: found };
  }

  // 2. Query Firebase Firestore database
  try {
    const remoteUser = await getUserFromFirebase(clean);
    if (remoteUser) {
      if (password && remoteUser.password && remoteUser.password !== password) {
        return { success: false, error: 'Incorrect password. Please try again.' };
      }

      // Save into local list
      const idx = users.findIndex(u => u.id === remoteUser.id);
      if (idx >= 0) {
        users[idx] = remoteUser;
      } else {
        users.push(remoteUser);
      }
      saveUsers(users);
      setCurrentUser(remoteUser);
      return { success: true, user: remoteUser };
    }
  } catch (err) {
    console.error('Firebase login error:', err);
  }

  return { success: false, error: 'User not found in Firebase backend. Check your ID, username, or email.' };
}

export function logoutUser(): void {
  setCurrentUser(null);
}

export const ADMIN_CONFIG = {
  id: 'Rahin',
  pass: 'rahin5566',
};

export function isAdminAuthenticated(): boolean {
  try {
    return localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function loginAdmin(id: string, pass: string): { success: boolean; error?: string } {
  const cleanId = id.trim().toLowerCase();
  if (cleanId === ADMIN_CONFIG.id.toLowerCase() && pass === ADMIN_CONFIG.pass) {
    try {
      localStorage.setItem(ADMIN_SESSION_KEY, 'true');
    } catch (e) {
      console.error(e);
    }
    return { success: true };
  }
  return { success: false, error: 'Invalid Admin ID or Password. Access denied.' };
}

export function logoutAdmin(): void {
  try {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  } catch (e) {
    console.error(e);
  }
}

export async function deleteUserAccount(userId: string): Promise<boolean> {
  const users = getAllUsers().filter(u => u.id !== userId);
  saveUsers(users);
  
  const current = getCurrentUser();
  if (current?.id === userId) {
    logoutUser();
  }
  
  await deleteUserFromFirebase(userId).catch(err => console.error(err));
  return true;
}

export function updateUserProfile(updates: Partial<Pick<User, 'name' | 'username' | 'avatar'>>): User | null {
  const current = getCurrentUser();
  if (!current) return null;

  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === current.id);
  if (idx < 0) return null;

  const updated: User = {
    ...users[idx],
    ...updates,
  };

  users[idx] = updated;
  saveUsers(users);
  setCurrentUser(updated);
  return updated;
}

export function changeUserPassword(currentPassword: string, newPassword: string): { success: boolean; error?: string } {
  const current = getCurrentUser();
  if (!current) {
    return { success: false, error: 'You must be signed in to change your password.' };
  }

  const expectedPass = current.password || 'password';
  if (currentPassword.trim() !== expectedPass.trim()) {
    return { success: false, error: 'Current password is incorrect. Please enter your existing password.' };
  }

  if (!newPassword || newPassword.trim().length < 4) {
    return { success: false, error: 'New password must be at least 4 characters long.' };
  }

  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === current.id);
  if (idx < 0) return { success: false, error: 'User account not found.' };

  const updated: User = {
    ...users[idx],
    password: newPassword.trim(),
  };

  users[idx] = updated;
  saveUsers(users);
  setCurrentUser(updated);
  return { success: true };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const clean = email.trim().toLowerCase();
  if (!clean) return null;

  // 1. Check local users
  const users = getAllUsers();
  const localFound = users.find(u => u.email.toLowerCase() === clean);
  if (localFound) return localFound;

  // 2. Check Firebase Firestore
  try {
    const remote = await getUserFromFirebase(clean);
    if (remote) {
      const idx = users.findIndex(u => u.id === remote.id);
      if (idx >= 0) {
        users[idx] = remote;
      } else {
        users.push(remote);
      }
      saveUsersLocally(users);
      return remote;
    }
  } catch (err) {
    console.error('Error finding user by email in Firebase:', err);
  }

  return null;
}

export async function resetPasswordWithEmail(
  userId: string, 
  newPassword: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  if (!newPassword || newPassword.trim().length < 4) {
    return { success: false, error: 'Password must be at least 4 characters long.' };
  }

  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === userId);

  let targetUser: User | null = idx >= 0 ? users[idx] : null;

  if (!targetUser) {
    targetUser = await getUserFromFirebase(userId);
  }

  if (!targetUser) {
    return { success: false, error: 'User account not found.' };
  }

  const updated: User = {
    ...targetUser,
    password: newPassword.trim(),
  };

  if (idx >= 0) {
    users[idx] = updated;
  } else {
    users.push(updated);
  }

  saveUsers(users);
  setCurrentUser(updated);
  return { success: true, user: updated };
}

// Watch History
export function getWatchHistory(): WatchHistoryItem[] {
  const user = getCurrentUser();
  if (user) {
    return user.watchHistory || [];
  }
  try {
    const raw = localStorage.getItem(GUEST_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function addToWatchHistory(item: Omit<WatchHistoryItem, 'watched_at'>): void {
  const user = getCurrentUser();
  const newEntry: WatchHistoryItem = {
    ...item,
    watched_at: Date.now(),
  };

  if (user) {
    const users = getAllUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      const history = users[idx].watchHistory || [];
      // Remove existing item with same id & media_type
      const existingIdx = history.findIndex(h => h.id === item.id && h.media_type === item.media_type);
      if (existingIdx >= 0) {
        history.splice(existingIdx, 1);
      }
      history.unshift(newEntry);
      // Keep up to 50 items
      const updatedHistory = history.slice(0, 50);
      users[idx].watchHistory = updatedHistory;
      saveUsers(users);
      // Sync to Firebase backend
      syncWatchHistoryToFirebase(user.id, updatedHistory).catch(err => console.error('Firebase history sync error:', err));
    }
  } else {
    // Guest history
    try {
      const raw = localStorage.getItem(GUEST_HISTORY_KEY);
      const list: WatchHistoryItem[] = raw ? JSON.parse(raw) : [];
      const existingIdx = list.findIndex(h => h.id === item.id && h.media_type === item.media_type);
      if (existingIdx >= 0) {
        list.splice(existingIdx, 1);
      }
      list.unshift(newEntry);
      localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(list.slice(0, 50)));
    } catch (e) {
      console.error('Failed to save guest history:', e);
    }
  }
}

export function removeFromWatchHistory(id: number, mediaType: MediaType): void {
  const user = getCurrentUser();
  if (user) {
    const users = getAllUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      const filtered = (users[idx].watchHistory || []).filter(
        h => !(h.id === id && h.media_type === mediaType)
      );
      users[idx].watchHistory = filtered;
      saveUsers(users);
      syncWatchHistoryToFirebase(user.id, filtered).catch(err => console.error('Firebase history remove sync error:', err));
    }
  } else {
    try {
      const raw = localStorage.getItem(GUEST_HISTORY_KEY);
      if (raw) {
        const list: WatchHistoryItem[] = JSON.parse(raw);
        const filtered = list.filter(h => !(h.id === id && h.media_type === mediaType));
        localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.error('Failed to remove from guest history:', e);
    }
  }
}

export function clearWatchHistory(): void {
  const user = getCurrentUser();
  if (user) {
    const users = getAllUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users[idx].watchHistory = [];
      saveUsers(users);
      syncWatchHistoryToFirebase(user.id, []).catch(err => console.error('Firebase clear history error:', err));
    }
  } else {
    localStorage.removeItem(GUEST_HISTORY_KEY);
  }
}

// Watch Later / Watchlist
export function getWatchlist(): WatchlistItem[] {
  const user = getCurrentUser();
  if (user && user.watchLater) {
    return user.watchLater;
  }
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
    const user = getCurrentUser();
    if (user) {
      const users = getAllUsers();
      const idx = users.findIndex(u => u.id === user.id);
      if (idx >= 0) {
        users[idx].watchLater = list;
        saveUsers(users);
        syncWatchLaterToFirebase(user.id, list).catch(err => console.error('Firebase watch later sync error:', err));
      }
    }
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

    // Also automatically log to user's Watch History!
    addToWatchHistory({
      id: item.id,
      media_type: item.media_type,
      title: item.title,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      vote_average: 8.0,
      season: item.season,
      episode: item.episode,
      episode_title: item.episode_title,
      progress_percent: item.progress_percent,
    });
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
