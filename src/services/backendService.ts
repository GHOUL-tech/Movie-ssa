/**
 * UNIFIED BACKEND SERVICE LAYER
 * Connects Zinovis to Firebase (Default Primary) with seamless real-time syncing
 */

import { User, SupportMessage, SystemSettings, SubscriptionCode, SubscriptionTier } from '../types';
import * as Firebase from './firebase';
import * as Hatchable from './hatchable';

export type BackendProvider = 'firebase' | 'hatchable';

const BACKEND_PROVIDER_KEY = 'zinovis_active_backend_provider';

export function getActiveBackendProvider(): BackendProvider {
  try {
    const saved = localStorage.getItem(BACKEND_PROVIDER_KEY);
    if (saved === 'hatchable') return 'hatchable';
    return 'firebase'; // Default to Firebase
  } catch {
    return 'firebase';
  }
}

export function setActiveBackendProvider(provider: BackendProvider): void {
  try {
    localStorage.setItem(BACKEND_PROVIDER_KEY, provider);
  } catch {}
}

export interface BackendStatusResult {
  provider: BackendProvider;
  connected: boolean;
  quotaStatus: string;
  quotaExhausted?: boolean;
  latency?: string;
  error?: string;
  details?: any;
}

export async function testBackendConnection(): Promise<BackendStatusResult> {
  const provider = getActiveBackendProvider();
  if (provider === 'firebase') {
    const res = await Firebase.testFirestoreConnection();
    return {
      provider: 'firebase',
      connected: res.connected,
      quotaStatus: res.quotaExhausted ? 'Quota Exceeded' : 'Normal (Live Cloud Firestore)',
      quotaExhausted: res.quotaExhausted,
      error: res.error,
      details: res
    };
  } else {
    const res = await Hatchable.testHatchableConnection();
    const status = await Hatchable.getHatchableStatus();
    return {
      provider: 'hatchable',
      connected: res.connected,
      quotaStatus: 'Unlimited (Hatchable High-Performance)',
      quotaExhausted: false,
      latency: res.latency,
      error: res.error,
      details: status
    };
  }
}

// ==========================================
// 1. USER PROFILE & AUTH DATA
// ==========================================

export async function saveUserToBackend(user: User): Promise<boolean> {
  const provider = getActiveBackendProvider();
  if (provider === 'firebase') {
    await Firebase.saveUserToFirebase(user);
    // Optionally also sync to Hatchable for local cache/redundancy
    try {
      Hatchable.saveUserToHatchable(user).catch(() => {});
    } catch {}
    return true;
  } else {
    return await Hatchable.saveUserToHatchable(user);
  }
}

export async function getUserFromBackend(identifier: string): Promise<User | null> {
  const provider = getActiveBackendProvider();
  if (provider === 'firebase') {
    const user = await Firebase.getUserFromFirebase(identifier);
    if (user) return user;
    // Fallback attempt to Hatchable if not found in Firebase
    return await Hatchable.getUserFromHatchable(identifier);
  } else {
    const user = await Hatchable.getUserFromHatchable(identifier);
    if (user) return user;
    return await Firebase.getUserFromFirebase(identifier);
  }
}

export async function getAllUsersFromBackend(): Promise<User[]> {
  const provider = getActiveBackendProvider();
  if (provider === 'firebase') {
    const users = await Firebase.getAllUsersFromFirebase();
    if (users && users.length > 0) return users;
    return await Hatchable.getAllUsersFromHatchable();
  } else {
    const users = await Hatchable.getAllUsersFromHatchable();
    if (users && users.length > 0) return users;
    return await Firebase.getAllUsersFromFirebase();
  }
}

export async function deleteUserFromBackend(userId: string): Promise<boolean> {
  const provider = getActiveBackendProvider();
  if (provider === 'firebase') {
    const res = await Firebase.deleteUserFromFirebase(userId);
    try { Hatchable.deleteUserFromHatchable(userId).catch(() => {}); } catch {}
    return res;
  } else {
    return await Hatchable.deleteUserFromHatchable(userId);
  }
}

export function subscribeToUserDoc(userId: string, callback: (user: User | null) => void): (() => void) {
  const provider = getActiveBackendProvider();
  if (provider === 'firebase') {
    return Firebase.subscribeToUserDoc(userId, callback);
  } else {
    return Hatchable.subscribeToHatchableUserDoc(userId, callback);
  }
}

// ==========================================
// 2. SYSTEM SETTINGS
// ==========================================

export async function getSystemSettingsFromBackend(): Promise<SystemSettings> {
  const provider = getActiveBackendProvider();
  if (provider === 'firebase') {
    return await Firebase.getSystemSettingsFromFirebase();
  } else {
    return await Hatchable.getSystemSettingsFromHatchable();
  }
}

export async function saveSystemSettingsToBackend(settings: Partial<SystemSettings>): Promise<boolean> {
  const provider = getActiveBackendProvider();
  if (provider === 'firebase') {
    await Firebase.saveSystemSettingsToFirebase(settings);
    try { Hatchable.saveSystemSettingsToHatchable(settings).catch(() => {}); } catch {}
    return true;
  } else {
    return await Hatchable.saveSystemSettingsToHatchable(settings);
  }
}

export function subscribeToSystemSettings(callback: (settings: SystemSettings) => void): (() => void) {
  const provider = getActiveBackendProvider();
  if (provider === 'firebase') {
    return Firebase.subscribeToSystemSettings(callback);
  } else {
    return Hatchable.subscribeToHatchableSystemSettings(callback);
  }
}

// ==========================================
// 3. SUBSCRIPTION CODES & PASSES
// ==========================================

export async function getAllSubscriptionCodesFromBackend(): Promise<SubscriptionCode[]> {
  const provider = getActiveBackendProvider();
  if (provider === 'firebase') {
    const codes = await Firebase.getAllSubscriptionCodesFromFirebase();
    if (codes && codes.length > 0) return codes;
    return await Hatchable.getAllSubscriptionCodesFromHatchable();
  } else {
    const codes = await Hatchable.getAllSubscriptionCodesFromHatchable();
    if (codes && codes.length > 0) return codes;
    return await Firebase.getAllSubscriptionCodesFromFirebase();
  }
}

export async function saveSubscriptionCodeToBackend(code: SubscriptionCode): Promise<boolean> {
  const provider = getActiveBackendProvider();
  if (provider === 'firebase') {
    await Firebase.saveSubscriptionCodeToFirebase(code);
    try { Hatchable.saveSubscriptionCodeToHatchable(code).catch(() => {}); } catch {}
    return true;
  } else {
    return await Hatchable.saveSubscriptionCodeToHatchable(code);
  }
}

export async function deleteSubscriptionCodeFromBackend(codeId: string): Promise<boolean> {
  const provider = getActiveBackendProvider();
  if (provider === 'firebase') {
    const res = await Firebase.deleteSubscriptionCodeFromFirebase(codeId);
    try { Hatchable.deleteSubscriptionCodeFromHatchable(codeId).catch(() => {}); } catch {}
    return res;
  } else {
    return await Hatchable.deleteSubscriptionCodeFromHatchable(codeId);
  }
}

export async function redeemSubscriptionCodeInBackend(
  code: string,
  user: User
): Promise<{ success: boolean; message: string; tier?: SubscriptionTier; user?: User }> {
  const provider = getActiveBackendProvider();
  if (provider === 'firebase') {
    return await Firebase.redeemSubscriptionCodeInFirebase(code, user);
  } else {
    return await Hatchable.redeemSubscriptionCodeInHatchable(code, user);
  }
}

export function subscribeToSubscriptionCodes(callback: (codes: SubscriptionCode[]) => void): (() => void) {
  const provider = getActiveBackendProvider();
  if (provider === 'firebase') {
    return Firebase.subscribeToSubscriptionCodes(callback);
  } else {
    return Hatchable.subscribeToHatchableSubscriptionCodes(callback);
  }
}

// ==========================================
// 4. LIVE SUPPORT TICKETS
// ==========================================

export async function getAllSupportMessagesFromBackend(): Promise<SupportMessage[]> {
  const provider = getActiveBackendProvider();
  if (provider === 'firebase') {
    return await Firebase.getAllSupportMessagesFromFirebase();
  } else {
    return await Hatchable.getAllSupportMessagesFromHatchable();
  }
}

export async function getUserSupportMessagesFromBackend(userId: string): Promise<SupportMessage[]> {
  const provider = getActiveBackendProvider();
  if (provider === 'firebase') {
    return await Firebase.getUserSupportMessagesFromFirebase(userId);
  } else {
    return await Hatchable.getUserSupportMessagesFromHatchable(userId);
  }
}

export async function sendSupportMessageToBackend(msg: Omit<SupportMessage, 'id'> & { id?: string }): Promise<boolean> {
  const provider = getActiveBackendProvider();
  if (provider === 'firebase') {
    const res = await Firebase.sendSupportMessageToFirebase({
      ...msg,
      createdAt: msg.createdAt || Date.now(),
    });
    return !!res;
  } else {
    return await Hatchable.sendSupportMessageToHatchable(msg);
  }
}

export function subscribeToAllSupportMessages(callback: (messages: SupportMessage[]) => void): (() => void) {
  const provider = getActiveBackendProvider();
  if (provider === 'firebase') {
    return Firebase.subscribeToAllSupportMessages(callback);
  } else {
    return Hatchable.subscribeToHatchableSupportMessages(callback);
  }
}

export function subscribeToUserSupportMessages(userId: string, callback: (messages: SupportMessage[]) => void): (() => void) {
  const provider = getActiveBackendProvider();
  if (provider === 'firebase') {
    return Firebase.subscribeToUserSupportMessages(userId, callback);
  } else {
    return Hatchable.subscribeToHatchableSupportMessages(callback, userId);
  }
}
