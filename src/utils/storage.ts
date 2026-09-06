import { ContinueWatchingItem, MediaType, WatchlistItem, WatchHistoryItem, User, SystemSettings, SubscriptionCode, SubscriptionTier, UserSubscription } from '../types';
import { DEFAULT_AVATAR, getInitialAvatar } from './avatars';
import { 
  saveUserToFirebase, 
  getUserFromFirebase, 
  syncWatchHistoryToFirebase, 
  syncWatchLaterToFirebase,
  deleteUserFromFirebase,
  saveSystemSettingsToFirebase,
  saveSubscriptionCodeToFirebase,
  deleteSubscriptionCodeFromFirebase
} from '../services/firebase';

const WATCHLIST_KEY = 'cinescope_watchlist_v1';
const CONTINUE_WATCHING_KEY = 'cinescope_continue_watching_v1';
const PREFERRED_SERVER_KEY = 'cinescope_server_pref_v1';
const USERS_KEY = 'zinovis_users_v2';
const CURRENT_USER_ID_KEY = 'zinovis_current_user_id_v2';
const GUEST_HISTORY_KEY = 'zinovis_guest_history_v1';
const ADMIN_SESSION_KEY = 'zinovis_admin_auth_session';
const SYSTEM_SETTINGS_KEY = 'zinovis_system_settings_v1';
const SUBSCRIPTION_CODES_KEY = 'zinovis_subscription_codes_v1';
const DEFAULT_SHOP_URL = 'https://unikagamingshopnew.vercel.app/';

// Seed demo user if no users exist
function getInitialUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as User[];
      // Filter out the legacy demo user if it exists in local storage
      const filtered = parsed.filter(u => u.id !== 'zinovis_vip');
      if (filtered.length !== parsed.length) {
        localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
      }
      return filtered;
    }
  } catch (e) {
    console.error('Failed to parse users:', e);
  }

  // Return empty array instead of seeding demo user
  const users: User[] = [];
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to init users:', e);
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

export async function adminUpdateUser(
  userId: string,
  updates: Partial<Omit<User, 'id' | 'watchHistory' | 'watchLater' | 'joinedAt'>>
): Promise<{ success: boolean; user?: User; error?: string }> {
  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx < 0) {
    return { success: false, error: 'User not found in user database.' };
  }

  const updated: User = {
    ...users[idx],
    ...updates,
  };

  users[idx] = updated;
  saveUsers(users);

  // If current logged-in user is updated, sync active session
  const current = getCurrentUser();
  if (current?.id === userId) {
    setCurrentUser(updated);
  }

  // Save to Firebase Firestore backend
  try {
    await saveUserToFirebase(updated);
  } catch (err) {
    console.error('Failed to sync updated user to Firebase:', err);
  }

  return { success: true, user: updated };
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

// -------------------------------------------------------------
// System Settings (Subscription Required Toggle & Shop URL)
// -------------------------------------------------------------

export function getSystemSettings(): SystemSettings {
  try {
    const raw = localStorage.getItem(SYSTEM_SETTINGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse system settings:', e);
  }
  return {
    subscriptionRequired: false,
    shopUrl: DEFAULT_SHOP_URL,
    updatedAt: Date.now(),
  };
}

export function saveSystemSettings(settings: Partial<SystemSettings>): SystemSettings {
  const current = getSystemSettings();
  const updated: SystemSettings = {
    ...current,
    ...settings,
    updatedAt: Date.now(),
  };
  try {
    localStorage.setItem(SYSTEM_SETTINGS_KEY, JSON.stringify(updated));
    saveSystemSettingsToFirebase(updated).catch(e => console.error('Firebase save settings error:', e));
  } catch (e) {
    console.error('Failed to save system settings:', e);
  }
  return updated;
}

// -------------------------------------------------------------
// Subscription Codes Management
// -------------------------------------------------------------

export function getSubscriptionCodes(): SubscriptionCode[] {
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_CODES_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse subscription codes:', e);
  }
  return [];
}

export function saveSubscriptionCodes(codes: SubscriptionCode[]): void {
  try {
    localStorage.setItem(SUBSCRIPTION_CODES_KEY, JSON.stringify(codes));
  } catch (e) {
    console.error('Failed to save subscription codes:', e);
  }
}

export function createSubscriptionCode(
  tier: SubscriptionTier, 
  customCode?: string,
  note?: string
): SubscriptionCode {
  let durationDays = 30;
  if (tier === 'permanent') durationDays = 0;
  else if (tier === 'six_months') durationDays = 180;
  else if (tier === 'one_year') durationDays = 365;

  const codeString = customCode?.trim().toUpperCase() || generateRandomCodeString(tier);
  const newCode: SubscriptionCode = {
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    code: codeString,
    tier,
    durationDays,
    createdAt: Date.now(),
    isRedeemed: false,
    note: note?.trim() || undefined,
  };

  const codes = getSubscriptionCodes();
  codes.unshift(newCode);
  saveSubscriptionCodes(codes);
  saveSubscriptionCodeToFirebase(newCode).catch(e => console.error('Firebase save code error:', e));

  return newCode;
}

export function createBatchSubscriptionCodes(
  tier: SubscriptionTier,
  count: number,
  note?: string
): SubscriptionCode[] {
  const created: SubscriptionCode[] = [];
  const existingCodes = getSubscriptionCodes();

  for (let i = 0; i < count; i++) {
    let durationDays = 30;
    if (tier === 'permanent') durationDays = 0;
    else if (tier === 'six_months') durationDays = 180;
    else if (tier === 'one_year') durationDays = 365;

    const codeString = generateRandomCodeString(tier);
    const newCode: SubscriptionCode = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${i}`,
      code: codeString,
      tier,
      durationDays,
      createdAt: Date.now() + i,
      isRedeemed: false,
      note: note?.trim() || undefined,
    };
    created.push(newCode);
    existingCodes.unshift(newCode);
    saveSubscriptionCodeToFirebase(newCode).catch(e => console.error('Firebase save code error:', e));
  }

  saveSubscriptionCodes(existingCodes);
  return created;
}

export async function deleteSubscriptionCode(codeId: string): Promise<void> {
  const codes = getSubscriptionCodes().filter(c => c.id !== codeId);
  saveSubscriptionCodes(codes);
  await deleteSubscriptionCodeFromFirebase(codeId).catch(e => console.error('Firebase delete code error:', e));
}

export function generateRandomCodeString(tier: SubscriptionTier): string {
  const prefixMap: Record<SubscriptionTier, string> = {
    one_month: 'ZNV-1M',
    six_months: 'ZNV-6M',
    one_year: 'ZNV-1Y',
    permanent: 'ZNV-PERM',
  };
  const prefix = prefixMap[tier] || 'ZNV-VIP';
  const rand1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const rand2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${rand1}-${rand2}`;
}

export function checkUserHasActiveSubscription(user: User | null | undefined): boolean {
  if (!user || !user.subscription) return false;
  const sub = user.subscription;
  if (sub.isPermanent || sub.tier === 'permanent') return true;
  if (!sub.expiresAt) return false;
  return sub.expiresAt > Date.now();
}

export function getUserSubscriptionDaysLeft(user: User | null | undefined): number | 'Lifetime' | null {
  if (!user || !user.subscription) return null;
  const sub = user.subscription;
  if (sub.isPermanent || sub.tier === 'permanent' || !sub.expiresAt) return 'Lifetime';
  const diff = sub.expiresAt - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

