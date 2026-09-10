/**
 * UNIFIED BACKEND SERVICE LAYER
 * Connects Zinovis to Hatchable (Default Primary) with seamless fallback to Firebase
 */

import { User, SupportMessage, SystemSettings, SubscriptionCode, SubscriptionTier } from '../types';
import * as Hatchable from './hatchable';
import * as Firebase from './firebase';

export type BackendProvider = 'hatchable' | 'firebase';

const BACKEND_PROVIDER_KEY = 'zinovis_active_backend_provider';

export function getActiveBackendProvider(): BackendProvider {
  try {
    const saved = localStorage.getItem(BACKEND_PROVIDER_KEY);
    if (saved === 'firebase') return 'firebase';
    return 'hatchable'; // Default to Hatchable
  } catch {
    return 'hatchable';
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
  if (provider === 'hatchable') {
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
  } else {
    const res = await Firebase.testFirestoreConnection();
    return {
      provider: 'firebase',
      connected: res.connected,
      quotaStatus: res.quotaExhausted ? 'Quota Exceeded' : 'Normal',
      quotaExhausted: res.quotaExhausted,
      error: res.error,
      details: res
    };
  }
}

// ==========================================
// 1. USER PROFILE & AUTH DATA
// ==========================================

export async function saveUserToBackend(user: User): Promise<boolean> {
  const provider = getActiveBackendProvider();
  if (provider === 'hatchable') {
    return await Hatchable.saveUserToHatchable(user);
  } else {
    await Firebase.saveUserToFirebase(user);
    return true;
  }
}

export async function getUserFromBackend(identifier: string): Promise<User | null> {
  const provider = getActiveBackendProvider();
  if (provider === 'hatchable') {
    const user = await Hatchable.getUserFromHatchable(identifier);
    if (user) return user;
    // Fallback attempt to Firebase if not found in Hatchable yet
    return await Firebase.getUserFromFirebase(identifier);
  } else {
    return await Firebase.getUserFromFirebase(identifier);
  }
}

export async function getAllUsersFromBackend(): Promise<User[]> {
  const provider = getActiveBackendProvider();
  if (provider === 'hatchable') {
    const users = await Hatchable.getAllUsersFromHatchable();
    if (users && users.length > 0) return users;
    return await Firebase.getAllUsersFromFirebase();
  } else {
    return await Firebase.getAllUsersFromFirebase();
  }
}

export async function deleteUserFromBackend(userId: string): Promise<boolean> {
  const provider = getActiveBackendProvider();
  if (provider === 'hatchable') {
    return await Hatchable.deleteUserFromHatchable(userId);
  } else {
    return await Firebase.deleteUserFromFirebase(userId);
  }
}

export function subscribeToUserDoc(userId: string, callback: (user: User | null) => void): (() => void) {
  const provider = getActiveBackendProvider();
  if (provider === 'hatchable') {
    return Hatchable.subscribeToHatchableUserDoc(userId, callback);
  } else {
    return Firebase.subscribeToUserDoc(userId, callback);
  }
}

// ==========================================
// 2. SYSTEM SETTINGS
// ==========================================

export async function getSystemSettingsFromBackend(): Promise<SystemSettings> {
  const provider = getActiveBackendProvider();
  if (provider === 'hatchable') {
    return await Hatchable.getSystemSettingsFromHatchable();
  } else {
    return await Firebase.getSystemSettingsFromFirebase();
  }
}

export async function saveSystemSettingsToBackend(settings: Partial<SystemSettings>): Promise<boolean> {
  const provider = getActiveBackendProvider();
  if (provider === 'hatchable') {
    return await Hatchable.saveSystemSettingsToHatchable(settings);
  } else {
    await Firebase.saveSystemSettingsToFirebase(settings);
    return true;
  }
}

export function subscribeToSystemSettings(callback: (settings: SystemSettings) => void): (() => void) {
  const provider = getActiveBackendProvider();
  if (provider === 'hatchable') {
    return Hatchable.subscribeToHatchableSystemSettings(callback);
  } else {
    return Firebase.subscribeToSystemSettings(callback);
  }
}

// ==========================================
// 3. SUBSCRIPTION CODES & PASSES
// ==========================================

export async function getAllSubscriptionCodesFromBackend(): Promise<SubscriptionCode[]> {
  const provider = getActiveBackendProvider();
  if (provider === 'hatchable') {
    const codes = await Hatchable.getAllSubscriptionCodesFromHatchable();
    if (codes && codes.length > 0) return codes;
    return await Firebase.getAllSubscriptionCodesFromFirebase();
  } else {
    return await Firebase.getAllSubscriptionCodesFromFirebase();
  }
}

export async function saveSubscriptionCodeToBackend(code: SubscriptionCode): Promise<boolean> {
  const provider = getActiveBackendProvider();
  if (provider === 'hatchable') {
    return await Hatchable.saveSubscriptionCodeToHatchable(code);
  } else {
    await Firebase.saveSubscriptionCodeToFirebase(code);
    return true;
  }
}

export async function deleteSubscriptionCodeFromBackend(codeId: string): Promise<boolean> {
  const provider = getActiveBackendProvider();
  if (provider === 'hatchable') {
    return await Hatchable.deleteSubscriptionCodeFromHatchable(codeId);
  } else {
    return await Firebase.deleteSubscriptionCodeFromFirebase(codeId);
  }
}

export async function redeemSubscriptionCodeInBackend(
  code: string,
  user: User
): Promise<{ success: boolean; message: string; tier?: SubscriptionTier; user?: User }> {
  const provider = getActiveBackendProvider();
  if (provider === 'hatchable') {
    return await Hatchable.redeemSubscriptionCodeInHatchable(code, user);
  } else {
    return await Firebase.redeemSubscriptionCodeInFirebase(code, user);
  }
}

export function subscribeToSubscriptionCodes(callback: (codes: SubscriptionCode[]) => void): (() => void) {
  const provider = getActiveBackendProvider();
  if (provider === 'hatchable') {
    return Hatchable.subscribeToHatchableSubscriptionCodes(callback);
  } else {
    return Firebase.subscribeToSubscriptionCodes(callback);
  }
}

// ==========================================
// 4. LIVE SUPPORT TICKETS
// ==========================================

export async function getAllSupportMessagesFromBackend(): Promise<SupportMessage[]> {
  const provider = getActiveBackendProvider();
  if (provider === 'hatchable') {
    return await Hatchable.getAllSupportMessagesFromHatchable();
  } else {
    return [];
  }
}

export async function getUserSupportMessagesFromBackend(userId: string): Promise<SupportMessage[]> {
  const provider = getActiveBackendProvider();
  if (provider === 'hatchable') {
    return await Hatchable.getUserSupportMessagesFromHatchable(userId);
  } else {
    return [];
  }
}

export async function sendSupportMessageToBackend(msg: Omit<SupportMessage, 'id'> & { id?: string }): Promise<boolean> {
  const provider = getActiveBackendProvider();
  if (provider === 'hatchable') {
    return await Hatchable.sendSupportMessageToHatchable(msg);
  } else {
    const res = await Firebase.sendSupportMessageToFirebase({
      ...msg,
      createdAt: msg.createdAt || Date.now(),
    });
    return !!res;
  }
}

export function subscribeToAllSupportMessages(callback: (messages: SupportMessage[]) => void): (() => void) {
  const provider = getActiveBackendProvider();
  if (provider === 'hatchable') {
    return Hatchable.subscribeToHatchableSupportMessages(callback);
  } else {
    return Firebase.subscribeToAllSupportMessages(callback);
  }
}

export function subscribeToUserSupportMessages(userId: string, callback: (messages: SupportMessage[]) => void): (() => void) {
  const provider = getActiveBackendProvider();
  if (provider === 'hatchable') {
    return Hatchable.subscribeToHatchableSupportMessages(callback, userId);
  } else {
    return Firebase.subscribeToUserSupportMessages(userId, callback);
  }
}
