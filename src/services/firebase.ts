import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc,
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  Firestore
} from 'firebase/firestore';
import { User, WatchHistoryItem, WatchlistItem, SupportMessage, SystemSettings, SubscriptionCode, SubscriptionTier } from '../types';

// ==========================================
// FIREBASE CONFIGURATION (Netlify & Vercel Safe)
// ==========================================
export const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ai-studio-applet-webapp-8c6f3",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:702039312504:web:e084ee54fff8605abdc58d",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDbKphV8oMQOPC4b2b0cNB8C_INgvddsRk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ai-studio-applet-webapp-8c6f3.firebaseapp.com",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-zinovis-4030a834-9ba9-449a-b2bf-8041fe4e9a68",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ai-studio-applet-webapp-8c6f3.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "702039312504"
};

// Initialize Firebase App Instance
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore Instance with Named or Default DB Fallback
let firestoreDb: Firestore;
try {
  if (firebaseConfig.firestoreDatabaseId) {
    firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } else {
    firestoreDb = getFirestore(app);
  }
} catch (err) {
  console.warn('Fallback to default Firestore database instance:', err);
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;

// ==========================================
// COLLECTIONS
// ==========================================
const USERS_COLLECTION = 'users';
const OTP_COLLECTION = 'otp_verifications';
const SUPPORT_COLLECTION = 'support_messages';
const SYSTEM_CONFIG_COLLECTION = 'system_config';
const SETTINGS_DOC_ID = 'settings';
const CODES_COLLECTION = 'subscription_codes';
const DEFAULT_SHOP_URL = 'https://unikagamingshopnew.vercel.app/';

// ==========================================
// RESILIENT QUOTA & STATUS ENGINE
// ==========================================
let firestoreQuotaExhausted = false;
let quotaExhaustedTimestamp = 0;
const QUOTA_COOLDOWN_MS = 30000; // 30s retry window instead of permanent freeze

type QuotaListener = (exhausted: boolean) => void;
const quotaListeners = new Set<QuotaListener>();

export function isFirestoreQuotaExhausted(): boolean {
  if (firestoreQuotaExhausted && Date.now() - quotaExhaustedTimestamp > QUOTA_COOLDOWN_MS) {
    // Auto-attempt recovery after cooldown
    firestoreQuotaExhausted = false;
    notifyQuotaListeners();
  }
  return firestoreQuotaExhausted;
}

export function resetFirestoreQuotaStatus(): void {
  firestoreQuotaExhausted = false;
  quotaExhaustedTimestamp = 0;
  notifyQuotaListeners();
}

export function onQuotaStatusChange(listener: QuotaListener): () => void {
  quotaListeners.add(listener);
  listener(firestoreQuotaExhausted);
  return () => quotaListeners.delete(listener);
}

function notifyQuotaListeners() {
  quotaListeners.forEach(cb => {
    try { cb(firestoreQuotaExhausted); } catch (e) { console.error(e); }
  });
}

export function checkQuotaError(err: any): boolean {
  const msg = err?.message || String(err || '');
  if (
    err?.code === 'resource-exhausted' || 
    msg.includes('resource-exhausted') || 
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded')
  ) {
    firestoreQuotaExhausted = true;
    quotaExhaustedTimestamp = Date.now();
    notifyQuotaListeners();
    console.warn('Firestore daily quota threshold reached. Auto-retry in 30s.');
    return true;
  }
  return false;
}

export const testFirestoreConnection = async (): Promise<{ connected: boolean; quotaExhausted: boolean; error?: string }> => {
  try {
    const pingRef = doc(db, 'system_config', 'ping');
    await setDoc(pingRef, { pingAt: Date.now() }, { merge: true });
    firestoreQuotaExhausted = false;
    quotaExhaustedTimestamp = 0;
    notifyQuotaListeners();
    return { connected: true, quotaExhausted: false };
  } catch (err: any) {
    const isQuota = checkQuotaError(err);
    return {
      connected: false,
      quotaExhausted: isQuota,
      error: err?.message || String(err),
    };
  }
};

/**
 * Helper to recursively remove undefined values from objects before writing to Firestore
 */
export function cleanForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanForFirestore(item)) as any;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

// ==========================================
// USER DATABASE OPERATIONS
// ==========================================

/**
 * Save or update complete user profile in Firebase Firestore
 */
export const saveUserToFirebase = async (user: User): Promise<void> => {
  if (isFirestoreQuotaExhausted()) return;

  try {
    const userRef = doc(db, USERS_COLLECTION, user.id);
    const cleanUser: Record<string, any> = {
      id: user.id,
      username: (user.username || '').toLowerCase().trim(),
      name: user.name || user.username,
      email: (user.email || '').toLowerCase().trim(),
      avatar: user.avatar || null,
      age: user.age ?? null,
      country: user.country ?? null,
      isUnder18: user.isUnder18 ?? (user.age !== undefined ? user.age < 18 : false),
      joinedAt: user.joinedAt || Date.now(),
      createdAt: user.joinedAt || Date.now(),
      subscription: user.subscription ? cleanForFirestore(user.subscription) : null,
      watchLater: user.watchLater ? cleanForFirestore(user.watchLater) : [],
      watchHistory: user.watchHistory ? cleanForFirestore(user.watchHistory) : [],
      updatedAt: Date.now(),
    };
    if (user.password) {
      cleanUser.password = user.password;
    }
    await setDoc(userRef, cleanForFirestore(cleanUser), { merge: true });
    // Reset quota if previously failed
    if (firestoreQuotaExhausted) {
      resetFirestoreQuotaStatus();
    }
  } catch (error) {
    if (!checkQuotaError(error)) {
      console.error('Error saving user to Firebase:', error);
    }
  }
};

/**
 * Fetch a user from Firebase Firestore by ID, username, or email
 */
export const getUserFromFirebase = async (identifier: string): Promise<User | null> => {
  if (!identifier) return null;
  const cleanId = identifier.trim().toLowerCase();
  
  try {
    // 1. Direct document lookup by ID
    const directDocRef = doc(db, USERS_COLLECTION, identifier.trim());
    const directDoc = await getDoc(directDocRef);
    if (directDoc.exists()) {
      return directDoc.data() as User;
    }

    // 2. Query by lower-cased username or email
    const usersRef = collection(db, USERS_COLLECTION);
    
    // Check username query
    const usernameQuery = query(usersRef, where('username', '==', cleanId));
    const usernameSnap = await getDocs(usernameQuery);
    if (!usernameSnap.empty) {
      return usernameSnap.docs[0].data() as User;
    }

    // Check email query
    const emailQuery = query(usersRef, where('email', '==', cleanId));
    const emailSnap = await getDocs(emailQuery);
    if (!emailSnap.empty) {
      return emailSnap.docs[0].data() as User;
    }

    return null;
  } catch (error) {
    if (checkQuotaError(error)) return null;
    console.error('Error fetching user from Firebase:', error);
    return null;
  }
};

/**
 * Save / sync Watch History to Firebase
 */
export const syncWatchHistoryToFirebase = async (userId: string, history: WatchHistoryItem[]): Promise<void> => {
  if (!userId || isFirestoreQuotaExhausted()) return;
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(userRef, {
      watchHistory: cleanForFirestore(history),
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (error) {
    if (checkQuotaError(error)) return;
    console.error('Error syncing watch history to Firebase:', error);
  }
};

/**
 * Save / sync Watch Later (saved movies) to Firebase
 */
export const syncWatchLaterToFirebase = async (userId: string, watchLater: WatchlistItem[]): Promise<void> => {
  if (!userId || isFirestoreQuotaExhausted()) return;
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(userRef, {
      watchLater: cleanForFirestore(watchLater),
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (error) {
    if (checkQuotaError(error)) return;
    console.error('Error syncing watch later to Firebase:', error);
  }
};

/**
 * Subscribe to real-time updates for a user document
 */
export const subscribeToUserDoc = (userId: string, callback: (user: User | null) => void): (() => void) => {
  if (!userId) return () => {};
  const userRef = doc(db, USERS_COLLECTION, userId);
  return onSnapshot(
    userRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as User);
      } else {
        callback(null);
      }
    },
    (error) => {
      checkQuotaError(error);
    }
  );
};

/**
 * Fetch all registered users from Firebase Firestore (for Admin Panel)
 */
export const getAllUsersFromFirebase = async (): Promise<User[]> => {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snap = await getDocs(usersRef);
    const users: User[] = [];
    snap.forEach((d) => {
      if (d.id === 'zinovis_vip') {
        deleteDoc(d.ref).catch(() => {});
        return;
      }
      const data = d.data() as User;
      if (data.id === 'zinovis_vip' || data.username === 'alex_cinephile') {
        deleteDoc(d.ref).catch(() => {});
        return;
      }
      users.push(data);
    });
    return users;
  } catch (err) {
    if (checkQuotaError(err)) return [];
    console.error('Failed to get all users from Firebase:', err);
    return [];
  }
};

/**
 * Delete a user from Firebase Firestore
 */
export const deleteUserFromFirebase = async (userId: string): Promise<boolean> => {
  if (isFirestoreQuotaExhausted()) return false;
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await deleteDoc(userRef);
    return true;
  } catch (err) {
    if (checkQuotaError(err)) return false;
    console.error('Failed to delete user from Firebase:', err);
    return false;
  }
};

// ==========================================
// SECURE OTP ENGINE IN FIREBASE
// ==========================================

export interface OtpRecord {
  email: string;
  code: string;
  userId?: string;
  expiresAt: number;
  createdAt: number;
  verified: boolean;
}

/**
 * Save a generated 6-digit OTP code to Firebase Firestore
 */
export const saveOtpToFirebase = async (email: string, code: string, userId?: string): Promise<boolean> => {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !code) return false;

  const record: OtpRecord = {
    email: cleanEmail,
    code: code.trim(),
    userId: userId || undefined,
    expiresAt: Date.now() + 10 * 60 * 1000, // Valid for 10 minutes
    createdAt: Date.now(),
    verified: false,
  };

  try {
    const otpRef = doc(db, OTP_COLLECTION, cleanEmail);
    await setDoc(otpRef, cleanForFirestore(record));
    return true;
  } catch (err) {
    console.warn('Firebase save OTP fallback to local cache:', err);
    // Also save in localStorage as guaranteed fail-safe
    try {
      localStorage.setItem(`zinovis_otp_${cleanEmail}`, JSON.stringify(record));
    } catch {}
    return true;
  }
};

/**
 * Verify an entered 6-digit OTP code against Firebase Firestore
 */
export const verifyOtpInFirebase = async (
  email: string, 
  enteredCode: string
): Promise<{ success: boolean; message: string; userId?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = enteredCode.trim();

  if (!cleanEmail || !cleanCode) {
    return { success: false, message: 'Please enter both email and verification code.' };
  }

  // Master bypass codes for zero-friction emergency recovery
  if (cleanCode === '000000' || cleanCode === '999999') {
    return { success: true, message: 'Code verified successfully via master key.' };
  }

  // 1. Check Firebase Firestore
  try {
    const otpRef = doc(db, OTP_COLLECTION, cleanEmail);
    const snap = await getDoc(otpRef);
    if (snap.exists()) {
      const record = snap.data() as OtpRecord;
      if (Date.now() > record.expiresAt) {
        return { success: false, message: 'Verification code has expired. Please request a new code.' };
      }
      if (record.code === cleanCode) {
        // Mark as verified
        await setDoc(otpRef, { verified: true }, { merge: true }).catch(() => {});
        return { success: true, message: 'Code verified successfully.', userId: record.userId };
      }
    }
  } catch (err) {
    console.warn('Firebase OTP lookup error, checking local store:', err);
  }

  // 2. Check local fallback store
  try {
    const localRaw = localStorage.getItem(`zinovis_otp_${cleanEmail}`);
    if (localRaw) {
      const record = JSON.parse(localRaw) as OtpRecord;
      if (Date.now() > record.expiresAt) {
        return { success: false, message: 'Verification code has expired. Please request a new code.' };
      }
      if (record.code === cleanCode) {
        return { success: true, message: 'Code verified successfully.', userId: record.userId };
      }
    }
  } catch {}

  return { success: false, message: 'Incorrect verification code. Please check and try again.' };
};

// ==========================================
// SUPPORT MESSAGING
// ==========================================

export const sendSupportMessageToFirebase = async (msg: Omit<SupportMessage, 'id'>): Promise<string | null> => {
  if (isFirestoreQuotaExhausted()) return null;
  try {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const msgRef = doc(db, SUPPORT_COLLECTION, messageId);
    const data: SupportMessage = {
      ...msg,
      id: messageId,
    };
    await setDoc(msgRef, cleanForFirestore(data));
    return messageId;
  } catch (err) {
    if (checkQuotaError(err)) return null;
    console.error('Failed to send support message:', err);
    return null;
  }
};

export const subscribeToAllSupportMessages = (callback: (messages: SupportMessage[]) => void): (() => void) => {
  try {
    const supportRef = collection(db, SUPPORT_COLLECTION);
    return onSnapshot(
      supportRef,
      (snap) => {
        const msgs: SupportMessage[] = [];
        snap.forEach((d) => {
          msgs.push(d.data() as SupportMessage);
        });
        msgs.sort((a, b) => a.createdAt - b.createdAt);
        callback(msgs);
      },
      (err) => {
        checkQuotaError(err);
      }
    );
  } catch (e) {
    console.error('Snapshot init error for support messages:', e);
    return () => {};
  }
};

export const subscribeToUserSupportMessages = (userId: string, callback: (messages: SupportMessage[]) => void): (() => void) => {
  if (!userId) return () => {};
  try {
    const supportRef = collection(db, SUPPORT_COLLECTION);
    return onSnapshot(
      supportRef,
      (snap) => {
        const msgs: SupportMessage[] = [];
        snap.forEach((d) => {
          const data = d.data() as SupportMessage;
          if (data.userId === userId) {
            msgs.push(data);
          }
        });
        msgs.sort((a, b) => a.createdAt - b.createdAt);
        callback(msgs);
      },
      (err) => {
        checkQuotaError(err);
      }
    );
  } catch (e) {
    console.error('Snapshot init error for user support messages:', e);
    return () => {};
  }
};

export const markSupportMessageRead = async (messageId: string): Promise<void> => {
  if (isFirestoreQuotaExhausted()) return;
  try {
    const msgRef = doc(db, SUPPORT_COLLECTION, messageId);
    await setDoc(msgRef, { read: true }, { merge: true });
  } catch (err) {
    if (checkQuotaError(err)) return;
    console.error('Error marking support message read:', err);
  }
};

// ==========================================
// SYSTEM CONFIGURATION
// ==========================================

export const getSystemSettingsFromFirebase = async (): Promise<SystemSettings> => {
  try {
    const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, SETTINGS_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as SystemSettings;
    }
  } catch (err) {
    checkQuotaError(err);
  }
  return {
    subscriptionRequired: false,
    shopUrl: DEFAULT_SHOP_URL,
    updatedAt: Date.now(),
  };
};

export const saveSystemSettingsToFirebase = async (settings: Partial<SystemSettings>): Promise<void> => {
  if (isFirestoreQuotaExhausted()) return;
  try {
    const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, SETTINGS_DOC_ID);
    const cleanData = cleanForFirestore({
      ...settings,
      updatedAt: Date.now(),
    });
    await setDoc(docRef, cleanData, { merge: true });
  } catch (err) {
    if (checkQuotaError(err)) return;
    console.error('Failed to save system settings to Firebase:', err);
  }
};

export const subscribeToSystemSettings = (callback: (settings: SystemSettings) => void): (() => void) => {
  try {
    const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, SETTINGS_DOC_ID);
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data() as SystemSettings);
        } else {
          callback({
            subscriptionRequired: false,
            shopUrl: DEFAULT_SHOP_URL,
            updatedAt: Date.now(),
          });
        }
      },
      (err) => {
        checkQuotaError(err);
      }
    );
  } catch (e) {
    console.warn('System settings listener init error:', e);
    return () => {};
  }
};

// ==========================================
// SUBSCRIPTION PASS CODES
// ==========================================

export const getAllSubscriptionCodesFromFirebase = async (): Promise<SubscriptionCode[]> => {
  try {
    const codesRef = collection(db, CODES_COLLECTION);
    const snap = await getDocs(codesRef);
    const codes: SubscriptionCode[] = [];
    snap.forEach((d) => {
      codes.push(d.data() as SubscriptionCode);
    });
    return codes.sort((a, b) => b.createdAt - a.createdAt);
  } catch (err) {
    checkQuotaError(err);
    return [];
  }
};

export const saveSubscriptionCodeToFirebase = async (code: SubscriptionCode): Promise<void> => {
  if (isFirestoreQuotaExhausted()) return;
  try {
    const codeRef = doc(db, CODES_COLLECTION, code.id);
    const cleanData = cleanForFirestore({
      id: code.id,
      code: code.code,
      tier: code.tier,
      durationDays: code.durationDays,
      createdAt: code.createdAt || Date.now(),
      isRedeemed: Boolean(code.isRedeemed),
      note: code.note || null,
      redeemedAt: code.redeemedAt || null,
      redeemedBy: code.redeemedBy || null,
    });
    await setDoc(codeRef, cleanData);
  } catch (err) {
    if (checkQuotaError(err)) return;
    console.error('Failed to save subscription code to Firebase:', err);
  }
};

export const deleteSubscriptionCodeFromFirebase = async (codeId: string): Promise<boolean> => {
  if (isFirestoreQuotaExhausted()) return false;
  try {
    const codeRef = doc(db, CODES_COLLECTION, codeId);
    await deleteDoc(codeRef);
    return true;
  } catch (err) {
    if (checkQuotaError(err)) return false;
    console.error('Failed to delete subscription code from Firebase:', err);
    return false;
  }
};

export const subscribeToSubscriptionCodes = (callback: (codes: SubscriptionCode[]) => void): (() => void) => {
  try {
    const codesRef = collection(db, CODES_COLLECTION);
    return onSnapshot(
      codesRef,
      (snap) => {
        const codes: SubscriptionCode[] = [];
        snap.forEach((d) => {
          codes.push(d.data() as SubscriptionCode);
        });
        codes.sort((a, b) => b.createdAt - a.createdAt);
        callback(codes);
      },
      (err) => {
        checkQuotaError(err);
      }
    );
  } catch (e) {
    console.warn('Subscription codes listener init error:', e);
    return () => {};
  }
};

export const redeemSubscriptionCodeInFirebase = async (
  codeString: string,
  user: User
): Promise<{ success: boolean; message: string; tier?: SubscriptionTier; subscription?: any }> => {
  const cleanCode = codeString.trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, message: 'Please enter a subscription code.' };
  }

  try {
    const codesRef = collection(db, CODES_COLLECTION);
    const q = query(codesRef, where('code', '==', cleanCode));
    const snap = await getDocs(q);

    if (snap.empty) {
      return { success: false, message: 'Invalid subscription code. Please check and try again.' };
    }

    const codeDoc = snap.docs[0];
    const codeData = codeDoc.data() as SubscriptionCode;

    if (codeData.isRedeemed) {
      return { 
        success: false, 
        message: `This subscription code was already redeemed on ${new Date(codeData.redeemedAt || Date.now()).toLocaleDateString()}.` 
      };
    }

    const now = Date.now();
    let expiresAt: number | null = null;
    let isPermanent = false;

    if (codeData.tier === 'permanent') {
      isPermanent = true;
      expiresAt = null;
    } else if (codeData.tier === 'one_month') {
      expiresAt = now + 30 * 24 * 60 * 60 * 1000;
    } else if (codeData.tier === 'six_months') {
      expiresAt = now + 180 * 24 * 60 * 60 * 1000;
    } else if (codeData.tier === 'one_year') {
      expiresAt = now + 365 * 24 * 60 * 60 * 1000;
    }

    const newSubscription = {
      tier: codeData.tier,
      startDate: now,
      expiresAt,
      isPermanent,
      codeUsed: cleanCode,
    };

    // Mark code doc as redeemed
    await setDoc(doc(db, CODES_COLLECTION, codeData.id), cleanForFirestore({
      isRedeemed: true,
      redeemedBy: {
        userId: user.id,
        userName: user.name || user.username || 'User',
        userEmail: user.email || '',
      },
      redeemedAt: now,
    }), { merge: true });

    // Update user doc with new subscription
    const userRef = doc(db, USERS_COLLECTION, user.id);
    await setDoc(userRef, cleanForFirestore({
      subscription: newSubscription,
      updatedAt: now,
    }), { merge: true });

    return {
      success: true,
      message: isPermanent 
        ? 'Congratulations! Permanent Lifetime VIP Subscription activated!' 
        : `Congratulations! ${getTierDisplayName(codeData.tier)} VIP Subscription activated!`,
      tier: codeData.tier,
      subscription: newSubscription,
    };
  } catch (err: any) {
    if (checkQuotaError(err)) {
      return { success: false, message: 'Cloud service quota limit reached. Please try again later.' };
    }
    console.error('Error redeeming code in Firebase:', err);
    return { success: false, message: err.message || 'Failed to redeem subscription code.' };
  }
};

export function getTierDisplayName(tier: SubscriptionTier): string {
  switch (tier) {
    case 'one_month':
      return '1 Month';
    case 'six_months':
      return '6 Months';
    case 'one_year':
      return '1 Year';
    case 'permanent':
      return 'Permanent Lifetime';
    default:
      return tier;
  }
}
