import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { 
  getCurrentUser, 
  loginUserAsync, 
  registerUserAsync, 
  logoutUser, 
  updateUserProfile, 
  changeUserPassword,
  findUserByEmail as findUserByEmailStorage,
  resetPasswordWithEmail as resetPasswordWithEmailStorage,
  getWatchlist, 
  getWatchHistory,
  saveUsers,
  saveUsersLocally,
  getAllUsers,
  isAdminAuthenticated,
  loginAdmin as loginAdminStorage,
  logoutAdmin as logoutAdminStorage
} from '../utils/storage';
import { subscribeToUserDoc } from '../services/firebase';

interface AuthContextType {
  currentUser: User | null;
  isLoggedIn: boolean;
  isUnder18: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'signup';
  isFirebaseSynced: boolean;
  isAdmin: boolean;
  isAdminModalOpen: boolean;
  isSupportModalOpen: boolean;
  openAuthModal: (tab?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  openAdminModal: () => void;
  closeAdminModal: () => void;
  openSupportModal: () => void;
  closeSupportModal: () => void;
  loginAdmin: (id: string, pass: string) => { success: boolean; error?: string };
  logoutAdmin: () => void;
  login: (identifier: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signup: (params: {
    id?: string;
    username?: string;
    name: string;
    email: string;
    password?: string;
    age?: number;
    country?: string;
    isUnder18?: boolean;
    avatar?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: Partial<Pick<User, 'name' | 'username' | 'avatar'>>) => void;
  changePassword: (currentPass: string, newPass: string) => { success: boolean; error?: string };
  findUserByEmail: (email: string) => Promise<User | null>;
  resetPasswordAndLogin: (userId: string, newPass: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  watchLaterCount: number;
  watchHistoryCount: number;
  refreshUserData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(isAdminAuthenticated());
  const [watchLaterCount, setWatchLaterCount] = useState(0);
  const [watchHistoryCount, setWatchHistoryCount] = useState(0);
  const [isFirebaseSynced, setIsFirebaseSynced] = useState(true);

  const refreshUserData = useCallback(() => {
    const user = getCurrentUser();
    setCurrentUserState(user);
    setWatchLaterCount(getWatchlist().length);
    setWatchHistoryCount(getWatchHistory().length);
    setIsAdmin(isAdminAuthenticated());
  }, []);

  useEffect(() => {
    refreshUserData();
  }, [refreshUserData]);

  // Real-time Firestore sync listener for logged-in user
  useEffect(() => {
    const activeId = currentUser?.id;
    if (!activeId) return;

    const unsubscribe = subscribeToUserDoc(activeId, (remoteUser) => {
      if (!remoteUser) return;
      setIsFirebaseSynced(true);

      // Sync to local state safely without triggering a write-back loop to Firestore
      const users = getAllUsers();
      const idx = users.findIndex(u => u.id === remoteUser.id);
      if (idx >= 0) {
        users[idx] = { ...users[idx], ...remoteUser };
        saveUsersLocally(users);
      }

      setCurrentUserState((prev) => {
        if (!prev) return remoteUser;
        if (
          prev.id === remoteUser.id &&
          prev.name === remoteUser.name &&
          prev.avatar === remoteUser.avatar &&
          prev.age === remoteUser.age &&
          prev.country === remoteUser.country &&
          prev.email === remoteUser.email &&
          (prev.watchLater?.length || 0) === (remoteUser.watchLater?.length || 0) &&
          (prev.watchHistory?.length || 0) === (remoteUser.watchHistory?.length || 0)
        ) {
          return prev;
        }
        return remoteUser;
      });

      setWatchLaterCount((prev) => {
        const next = remoteUser.watchLater?.length || 0;
        return prev !== next ? next : prev;
      });

      setWatchHistoryCount((prev) => {
        const next = remoteUser.watchHistory?.length || 0;
        return prev !== next ? next : prev;
      });
    });

    return () => unsubscribe();
  }, [currentUser?.id]);

  const openAuthModal = (tab: 'login' | 'signup' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const login = async (identifier: string, password?: string) => {
    try {
      const res = await loginUserAsync(identifier, password);
      if (res.success && res.user) {
        setCurrentUserState(res.user);
        refreshUserData();
        setIsAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: res.error || 'Failed to log in' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Firebase login failed' };
    }
  };

  const signup = async (params: {
    id?: string;
    username?: string;
    name: string;
    email: string;
    password?: string;
    age?: number;
    country?: string;
    isUnder18?: boolean;
    avatar?: string;
  }) => {
    try {
      const res = await registerUserAsync(params);
      if (res.success && res.user) {
        setCurrentUserState(res.user);
        refreshUserData();
        setIsAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: res.error || 'Failed to create account' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Firebase registration failed' };
    }
  };

  const logout = () => {
    logoutUser();
    setCurrentUserState(null);
    refreshUserData();
  };

  const updateProfile = (updates: Partial<Pick<User, 'name' | 'username' | 'avatar'>>) => {
    const updated = updateUserProfile(updates);
    if (updated) {
      setCurrentUserState(updated);
      refreshUserData();
    }
  };

  const changePassword = (currentPass: string, newPass: string) => {
    const res = changeUserPassword(currentPass, newPass);
    if (res.success) {
      refreshUserData();
    }
    return res;
  };

  const findUserByEmail = async (email: string): Promise<User | null> => {
    return findUserByEmailStorage(email);
  };

  const resetPasswordAndLogin = async (userId: string, newPass: string) => {
    const res = await resetPasswordWithEmailStorage(userId, newPass);
    if (res.success && res.user) {
      setCurrentUserState(res.user);
      refreshUserData();
    }
    return res;
  };

  const openAdminModal = () => setIsAdminModalOpen(true);
  const closeAdminModal = () => setIsAdminModalOpen(false);

  const openSupportModal = () => setIsSupportModalOpen(true);
  const closeSupportModal = () => setIsSupportModalOpen(false);

  const loginAdmin = (id: string, pass: string) => {
    const res = loginAdminStorage(id, pass);
    if (res.success) {
      setIsAdmin(true);
      setIsAdminModalOpen(false);
    }
    return res;
  };

  const logoutAdmin = () => {
    logoutAdminStorage();
    setIsAdmin(false);
  };

  const isUnder18 = currentUser?.isUnder18 ?? (currentUser?.age !== undefined ? currentUser.age < 18 : false);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoggedIn: !!currentUser,
        isUnder18,
        isAuthModalOpen,
        authModalTab,
        isFirebaseSynced,
        isAdmin,
        isAdminModalOpen,
        isSupportModalOpen,
        openAuthModal,
        closeAuthModal,
        openAdminModal,
        closeAdminModal,
        openSupportModal,
        closeSupportModal,
        loginAdmin,
        logoutAdmin,
        login,
        signup,
        logout,
        updateProfile,
        changePassword,
        findUserByEmail,
        resetPasswordAndLogin,
        watchLaterCount,
        watchHistoryCount,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
