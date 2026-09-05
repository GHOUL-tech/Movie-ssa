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
import firebaseConfig from '../../firebase-applet-config.json';
import { User, WatchHistoryItem, WatchlistItem, SupportMessage } from '../types';

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore (with specific database ID from config if present)
let firestoreDb: Firestore;
try {
  if (firebaseConfig.firestoreDatabaseId) {
    firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } else {
    firestoreDb = getFirestore(app);
  }
} catch (err) {
  console.warn('Fallback to default Firestore database:', err);
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;

const USERS_COLLECTION = 'users';

/**
 * Save or update complete user profile in Firebase Firestore
 */
export const saveUserToFirebase = async (user: User): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, user.id);
    const cleanUser: Record<string, any> = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      age: user.age ?? null,
      country: user.country ?? null,
      isUnder18: user.isUnder18 ?? (user.age !== undefined ? user.age < 18 : false),
      joinedAt: user.joinedAt || Date.now(),
      createdAt: user.joinedAt || Date.now(),
      watchLater: user.watchLater || [],
      watchHistory: user.watchHistory || [],
      updatedAt: Date.now(),
    };
    if (user.password) {
      cleanUser.password = user.password;
    }
    await setDoc(userRef, cleanUser, { merge: true });
  } catch (error) {
    console.error('Error saving user to Firebase:', error);
  }
};

/**
 * Fetch a user from Firebase Firestore by ID, username, or email
 */
export const getUserFromFirebase = async (identifier: string): Promise<User | null> => {
  const cleanId = identifier.trim().toLowerCase();
  
  try {
    // 1. First try direct document lookup by user ID
    const directDocRef = doc(db, USERS_COLLECTION, identifier.trim());
    const directDoc = await getDoc(directDocRef);
    if (directDoc.exists()) {
      return directDoc.data() as User;
    }

    // 2. Query by username or email
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
    console.error('Error fetching user from Firebase:', error);
    return null;
  }
};

/**
 * Save / sync Watch History to Firebase
 */
export const syncWatchHistoryToFirebase = async (userId: string, history: WatchHistoryItem[]): Promise<void> => {
  if (!userId) return;
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(userRef, {
      watchHistory: history,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (error) {
    console.error('Error syncing watch history to Firebase:', error);
  }
};

/**
 * Save / sync Watch Later (saved movies) to Firebase
 */
export const syncWatchLaterToFirebase = async (userId: string, watchLater: WatchlistItem[]): Promise<void> => {
  if (!userId) return;
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(userRef, {
      watchLater,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (error) {
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
      console.error('Firestore snapshot listener error:', error);
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
      users.push(d.data() as User);
    });
    return users;
  } catch (err) {
    console.error('Failed to get all users from Firebase:', err);
    return [];
  }
};

/**
 * Delete a user from Firebase Firestore
 */
export const deleteUserFromFirebase = async (userId: string): Promise<boolean> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await deleteDoc(userRef);
    return true;
  } catch (err) {
    console.error('Failed to delete user from Firebase:', err);
    return false;
  }
};

const SUPPORT_COLLECTION = 'support_messages';

/**
 * Send a support message (user or admin)
 */
export const sendSupportMessageToFirebase = async (msg: Omit<SupportMessage, 'id'>): Promise<string | null> => {
  try {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const msgRef = doc(db, SUPPORT_COLLECTION, messageId);
    const data: SupportMessage = {
      ...msg,
      id: messageId,
    };
    await setDoc(msgRef, data);
    return messageId;
  } catch (err) {
    console.error('Failed to send support message:', err);
    return null;
  }
};

/**
 * Listen to all support messages in real-time (for Admin Panel)
 */
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
        // Sort chronologically
        msgs.sort((a, b) => a.createdAt - b.createdAt);
        callback(msgs);
      },
      (err) => {
        console.error('Error listening to all support messages:', err);
      }
    );
  } catch (e) {
    console.error('Snapshot init error for all support messages:', e);
    return () => {};
  }
};

/**
 * Listen to support messages for a specific user in real-time
 */
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
        console.error('Error listening to user support messages:', err);
      }
    );
  } catch (e) {
    console.error('Snapshot init error for user support messages:', e);
    return () => {};
  }
};

/**
 * Mark message as read
 */
export const markSupportMessageRead = async (messageId: string): Promise<void> => {
  try {
    const msgRef = doc(db, SUPPORT_COLLECTION, messageId);
    await setDoc(msgRef, { read: true }, { merge: true });
  } catch (err) {
    console.error('Error marking support message read:', err);
  }
};
