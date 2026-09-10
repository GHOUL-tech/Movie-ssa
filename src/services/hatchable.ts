/**
 * HATCHABLE BACKEND CLIENT SDK
 * High-performance, quota-free backend service for Zinovis
 */

import { User, SupportMessage, SystemSettings, SubscriptionCode, SubscriptionTier } from '../types';

export interface HatchableStatus {
  status: 'connected' | 'error' | 'connecting';
  provider: 'hatchable';
  engine: string;
  projectId: string;
  backendUrl: string;
  database: string;
  quota: 'unlimited';
  userCount: number;
  codeCount: number;
  supportMessageCount: number;
  latency?: string;
  timestamp: number;
  error?: string;
}

const DEFAULT_SHOP_URL = 'https://unikagamingshopnew.vercel.app/';

// In-app Realtime Event Bus for instantaneous cross-component updates
type HatchableEventType = 'users' | 'settings' | 'codes' | 'support';
const eventListeners: Record<HatchableEventType, Set<() => void>> = {
  users: new Set(),
  settings: new Set(),
  codes: new Set(),
  support: new Set()
};

export const triggerHatchableLocalUpdate = (type: HatchableEventType) => {
  if (eventListeners[type]) {
    eventListeners[type].forEach(cb => {
      try { cb(); } catch {}
    });
  }
};

/**
 * 1. Health & Connection Status
 */
export const getHatchableStatus = async (): Promise<HatchableStatus> => {
  try {
    const res = await fetch('/api/hatchable/status');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { ...data, status: 'connected' };
  } catch (err: any) {
    return {
      status: 'error',
      provider: 'hatchable',
      engine: 'Hatchable High-Performance Backend v2.4',
      projectId: 'zinovis-hatchable-main',
      backendUrl: 'integrated',
      database: 'PostgreSQL / Hatchable FileStore',
      quota: 'unlimited',
      userCount: 0,
      codeCount: 0,
      supportMessageCount: 0,
      timestamp: Date.now(),
      error: err?.message || 'Failed to connect to Hatchable backend'
    };
  }
};

export const testHatchableConnection = async (): Promise<{ connected: boolean; latency: string; error?: string }> => {
  const start = performance.now();
  try {
    const res = await fetch('/api/hatchable/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const elapsed = Math.round(performance.now() - start);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { connected: true, latency: `${elapsed}ms` };
  } catch (err: any) {
    return { connected: false, latency: 'timeout', error: err?.message || 'Connection failed' };
  }
};

/**
 * 2. User Management
 */
export const getAllUsersFromHatchable = async (): Promise<User[]> => {
  try {
    const res = await fetch('/api/hatchable/users');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[Hatchable] Error fetching all users:', err);
    return [];
  }
};

export const getUserFromHatchable = async (identifier: string): Promise<User | null> => {
  if (!identifier) return null;
  try {
    const res = await fetch(`/api/hatchable/users/${encodeURIComponent(identifier.trim().toLowerCase())}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[Hatchable] Error fetching user:', err);
    return null;
  }
};

export const saveUserToHatchable = async (user: User): Promise<boolean> => {
  if (!user || !user.id) return false;
  try {
    const res = await fetch('/api/hatchable/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    triggerHatchableLocalUpdate('users');
    return true;
  } catch (err) {
    console.error('[Hatchable] Error saving user:', err);
    return false;
  }
};

export const deleteUserFromHatchable = async (userId: string): Promise<boolean> => {
  if (!userId) return false;
  try {
    const res = await fetch(`/api/hatchable/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    triggerHatchableLocalUpdate('users');
    return true;
  } catch (err) {
    console.error('[Hatchable] Error deleting user:', err);
    return false;
  }
};

/**
 * 3. Realtime User Document Listener
 */
export const subscribeToHatchableUserDoc = (userId: string, callback: (user: User | null) => void): (() => void) => {
  if (!userId) return () => {};

  let isMounted = true;
  const fetchUser = async () => {
    if (!isMounted) return;
    const user = await getUserFromHatchable(userId);
    if (isMounted) callback(user);
  };

  // Initial fetch
  fetchUser();

  // Listen to local event triggers
  const listener = () => { fetchUser(); };
  eventListeners.users.add(listener);

  // Background interval poll every 4 seconds
  const interval = setInterval(fetchUser, 4000);

  return () => {
    isMounted = false;
    eventListeners.users.delete(listener);
    clearInterval(interval);
  };
};

/**
 * 4. System Settings
 */
export const getSystemSettingsFromHatchable = async (): Promise<SystemSettings> => {
  try {
    const res = await fetch('/api/hatchable/settings');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      subscriptionRequired: false,
      shopUrl: DEFAULT_SHOP_URL,
      backendProvider: 'hatchable',
      updatedAt: Date.now()
    };
  }
};

export const saveSystemSettingsToHatchable = async (settings: Partial<SystemSettings>): Promise<boolean> => {
  try {
    const res = await fetch('/api/hatchable/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...settings, backendProvider: 'hatchable' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    triggerHatchableLocalUpdate('settings');
    return true;
  } catch (err) {
    console.error('[Hatchable] Error saving settings:', err);
    return false;
  }
};

export const subscribeToHatchableSystemSettings = (callback: (settings: SystemSettings) => void): (() => void) => {
  let isMounted = true;
  const fetchSettings = async () => {
    if (!isMounted) return;
    const s = await getSystemSettingsFromHatchable();
    if (isMounted) callback(s);
  };

  fetchSettings();
  const listener = () => { fetchSettings(); };
  eventListeners.settings.add(listener);
  const interval = setInterval(fetchSettings, 5000);

  return () => {
    isMounted = false;
    eventListeners.settings.delete(listener);
    clearInterval(interval);
  };
};

/**
 * 5. Subscription Codes
 */
export const getAllSubscriptionCodesFromHatchable = async (): Promise<SubscriptionCode[]> => {
  try {
    const res = await fetch('/api/hatchable/codes');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[Hatchable] Error fetching subscription codes:', err);
    return [];
  }
};

export const saveSubscriptionCodeToHatchable = async (code: SubscriptionCode): Promise<boolean> => {
  try {
    const res = await fetch('/api/hatchable/codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(code)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    triggerHatchableLocalUpdate('codes');
    return true;
  } catch (err) {
    console.error('[Hatchable] Error saving subscription code:', err);
    return false;
  }
};

export const deleteSubscriptionCodeFromHatchable = async (codeId: string): Promise<boolean> => {
  try {
    const res = await fetch(`/api/hatchable/codes/${encodeURIComponent(codeId)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    triggerHatchableLocalUpdate('codes');
    return true;
  } catch (err) {
    console.error('[Hatchable] Error deleting subscription code:', err);
    return false;
  }
};

export const redeemSubscriptionCodeInHatchable = async (
  code: string,
  user: User
): Promise<{ success: boolean; message: string; tier?: SubscriptionTier; user?: User }> => {
  try {
    const res = await fetch('/api/hatchable/codes/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, user })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      triggerHatchableLocalUpdate('codes');
      triggerHatchableLocalUpdate('users');
      return data;
    }
    return { success: false, message: data.message || 'Failed to redeem code' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error during redemption' };
  }
};

export const subscribeToHatchableSubscriptionCodes = (callback: (codes: SubscriptionCode[]) => void): (() => void) => {
  let isMounted = true;
  const fetchCodes = async () => {
    if (!isMounted) return;
    const codes = await getAllSubscriptionCodesFromHatchable();
    if (isMounted) callback(codes);
  };

  fetchCodes();
  const listener = () => { fetchCodes(); };
  eventListeners.codes.add(listener);
  const interval = setInterval(fetchCodes, 4000);

  return () => {
    isMounted = false;
    eventListeners.codes.delete(listener);
    clearInterval(interval);
  };
};

/**
 * 6. Live Support Messages
 */
export const getAllSupportMessagesFromHatchable = async (): Promise<SupportMessage[]> => {
  try {
    const res = await fetch('/api/hatchable/support');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[Hatchable] Error fetching support messages:', err);
    return [];
  }
};

export const getUserSupportMessagesFromHatchable = async (userId: string): Promise<SupportMessage[]> => {
  if (!userId) return [];
  try {
    const res = await fetch(`/api/hatchable/support?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[Hatchable] Error fetching user support messages:', err);
    return [];
  }
};

export const sendSupportMessageToHatchable = async (msg: Omit<SupportMessage, 'id'> & { id?: string }): Promise<boolean> => {
  try {
    const res = await fetch('/api/hatchable/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    triggerHatchableLocalUpdate('support');
    return true;
  } catch (err) {
    console.error('[Hatchable] Error sending support message:', err);
    return false;
  }
};

export const markSupportMessageResolvedInHatchable = async (params: { messageId?: string; userId?: string }): Promise<boolean> => {
  try {
    const res = await fetch('/api/hatchable/support/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    triggerHatchableLocalUpdate('support');
    return true;
  } catch (err) {
    return false;
  }
};

export const subscribeToHatchableSupportMessages = (
  callback: (messages: SupportMessage[]) => void,
  userId?: string
): (() => void) => {
  let isMounted = true;
  const fetchMessages = async () => {
    if (!isMounted) return;
    const msgs = userId
      ? await getUserSupportMessagesFromHatchable(userId)
      : await getAllSupportMessagesFromHatchable();
    if (isMounted) callback(msgs);
  };

  fetchMessages();
  const listener = () => { fetchMessages(); };
  eventListeners.support.add(listener);
  const interval = setInterval(fetchMessages, 3000);

  return () => {
    isMounted = false;
    eventListeners.support.delete(listener);
    clearInterval(interval);
  };
};

/**
 * 7. Batch Sync
 */
export const syncClientDataToHatchable = async (payload?: {
  users?: User[];
  codes?: SubscriptionCode[];
  settings?: Partial<SystemSettings>;
}): Promise<{ success: boolean; usersSynced: number; codesSynced: number; error?: string }> => {
  try {
    const defaultUsers = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('zinovis_users') || '[]') : [];
    const defaultCodes = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('zinovis_subscription_codes') || '[]') : [];
    const defaultSettings = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('zinovis_system_settings') || '{}') : {};

    const usersToSync = payload?.users || defaultUsers;
    const codesToSync = payload?.codes || defaultCodes;
    const settingsToSync = payload?.settings || defaultSettings;

    const res = await fetch('/api/hatchable/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        users: usersToSync,
        codes: codesToSync,
        settings: settingsToSync,
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return {
      success: true,
      usersSynced: usersToSync.length,
      codesSynced: codesToSync.length
    };
  } catch (err: any) {
    return {
      success: false,
      usersSynced: 0,
      codesSynced: 0,
      error: err.message || 'Sync failed'
    };
  }
};
