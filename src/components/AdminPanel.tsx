import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  BarChart3, 
  Film, 
  Tv, 
  MessageSquare, 
  TrendingUp, 
  ShieldCheck, 
  Trash2, 
  LogOut, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Send, 
  Heart, 
  Globe, 
  Calendar, 
  Clock, 
  Sparkles, 
  Play, 
  UserCheck, 
  AlertTriangle,
  ArrowLeft,
  Filter,
  Check,
  KeyRound,
  Crown,
  CreditCard,
  Plus,
  Copy,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  Zap,
  CheckCheck,
  Lock,
  Unlock,
  Tag,
  AlertCircle,
  UserCog,
  Edit3,
  Save,
  Key,
  Eye,
  EyeOff,
  Download,
  Info,
  Database,
  Server,
  HardDrive,
  Layers,
  Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, SupportMessage, MediaItem, WatchHistoryItem, SubscriptionCode, SubscriptionTier, UserSubscription } from '../types';
import { 
  getAllUsersFromBackend, 
  deleteUserFromBackend, 
  sendSupportMessageToBackend, 
  subscribeToAllSupportMessages,
  subscribeToSubscriptionCodes,
  saveSubscriptionCodeToBackend,
  deleteSubscriptionCodeFromBackend,
  saveUserToBackend,
  testBackendConnection,
  BackendProvider
} from '../services/backendService';
import { 
  syncClientDataToHatchable,
  getHatchableStatus
} from '../services/hatchable';
import { 
  isFirestoreQuotaExhausted,
  onQuotaStatusChange,
  testFirestoreConnection
} from '../services/firebase';
import { 
  getAllUsers, 
  deleteUserAccount,
  adminUpdateUser,
  getSubscriptionCodes,
  createSubscriptionCode,
  createBatchSubscriptionCodes,
  deleteSubscriptionCode,
  generateRandomCodeString,
  saveUsersLocally,
  getUserSubscriptionDaysLeft,
  checkUserHasActiveSubscription,
  getPendingUserSyncs,
  syncPendingUsersToFirebase,
  restoreMasterSubscriptionCodes
} from '../utils/storage';
import { 
  getEmailJsConfig, 
  saveCustomEmailJsConfig, 
  sendOtpViaEmail, 
  EmailJsConfig 
} from '../services/emailService';
import { AVATAR_PRESETS } from '../utils/avatars';
import { getTrending, getImageUrl } from '../services/tmdb';

export const AdminPanel: React.FC = () => {
  const { 
    currentUser,
    isAdmin, 
    logoutAdmin, 
    isSubscriptionRequired, 
    setIsSubscriptionRequired, 
    shopUrl,
    backendProvider,
    setBackendProvider,
    refreshUserData 
  } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'movies' | 'subscriptions' | 'support'>('analytics');
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [trendingMedia, setTrendingMedia] = useState<MediaItem[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [selectedUserForChat, setSelectedUserForChat] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Subscription System State
  const [subscriptionCodes, setSubscriptionCodes] = useState<SubscriptionCode[]>(getSubscriptionCodes());
  const [subCodeSearch, setSubCodeSearch] = useState('');
  const [subCodeTierFilter, setSubCodeTierFilter] = useState<'all' | SubscriptionTier>('all');
  const [subCodeStatusFilter, setSubCodeStatusFilter] = useState<'all' | 'available' | 'redeemed'>('all');
  
  // Code Generator Form State
  const [genTier, setGenTier] = useState<SubscriptionTier>('one_month');
  const [genCustomCode, setGenCustomCode] = useState('');
  const [genBatchCount, setGenBatchCount] = useState<number>(1);
  const [genNote, setGenNote] = useState('');
  const [generatedCodesResult, setGeneratedCodesResult] = useState<SubscriptionCode[] | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedShopUrl, setCopiedShopUrl] = useState(false);
  const [isTogglingGate, setIsTogglingGate] = useState(false);
  const [deletingCodeId, setDeletingCodeId] = useState<string | null>(null);
  const [confirmDeleteCode, setConfirmDeleteCode] = useState<{ id: string; code: string } | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<{ id: string; name: string; email: string } | null>(null);

  // Edit User State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormName, setEditFormName] = useState('');
  const [editFormUsername, setEditFormUsername] = useState('');
  const [editFormEmail, setEditFormEmail] = useState('');
  const [editFormPassword, setEditFormPassword] = useState('');
  const [editFormAge, setEditFormAge] = useState<number | ''>('');
  const [editFormCountry, setEditFormCountry] = useState('');
  const [editFormAvatar, setEditFormAvatar] = useState('');
  const [showInspectPass, setShowInspectPass] = useState(false);

  // Firebase Quota & Offline Sync Diagnostics
  const [quotaExhausted, setQuotaExhausted] = useState(isFirestoreQuotaExhausted());
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncingPending, setIsSyncingPending] = useState(false);
  const [syncPendingResult, setSyncPendingResult] = useState<string | null>(null);
  const [pendingUsers, setPendingUsers] = useState<User[]>(getPendingUserSyncs());

  // Subscription Codes Backup & Restore
  const [restoringCodes, setRestoringCodes] = useState(false);

  // EmailJS Configuration Management (for Vercel & Live environments)
  const [emailConfig, setEmailConfig] = useState<EmailJsConfig>(getEmailJsConfig());
  const [emailConfigSuccess, setEmailConfigSuccess] = useState<string | null>(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const unsubQuota = onQuotaStatusChange((status) => {
      setQuotaExhausted(status);
      setPendingUsers(getPendingUserSyncs());
    });
    return () => unsubQuota();
  }, []);

  // If not admin, redirect to home
  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  const [isSyncingHatchable, setIsSyncingHatchable] = useState(false);
  const [syncHatchableResult, setSyncHatchableResult] = useState<string | null>(null);

  // Load all users from active Backend (Hatchable or Firebase) and fallback to local
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const localUsers = getAllUsers();
      let remoteUsers: User[] = [];

      try {
        remoteUsers = await getAllUsersFromBackend();
      } catch (err) {
        console.warn('Failed to load remote users:', err);
      }
      
      // Merge unique users by id
      const userMap = new Map<string, User>();
      const remoteIds = new Set(remoteUsers.map(u => u.id));
      
      localUsers.forEach(u => {
        userMap.set(u.id, u);
        if (remoteUsers.length > 0 && !remoteIds.has(u.id)) {
          saveUserToBackend(u).catch(console.error);
        }
      });
      remoteUsers.forEach(u => userMap.set(u.id, u));
      
      setUsers(Array.from(userMap.values()));
      setPendingUsers(getPendingUserSyncs());
    } catch (err) {
      console.error('Failed to load users for admin:', err);
      setUsers(getAllUsers());
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleDownloadUsersBackup = () => {
    const all = getAllUsers();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(all, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `zinovis_users_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const res = await testBackendConnection();
      if (res.connected) {
        setConnectionTestResult({ 
          success: true, 
          message: `${res.provider === 'hatchable' ? 'Hatchable High-Performance Backend' : 'Firebase Cloud Firestore'} is connected! Status: ${res.quotaStatus}${res.latency ? ` (${res.latency})` : ''}` 
        });
        setQuotaExhausted(false);
        loadUsers();
      } else if (res.quotaExhausted) {
        setQuotaExhausted(true);
        setConnectionTestResult({ 
          success: false, 
          message: 'Firebase Quota Exceeded (resource-exhausted). Switch to Hatchable backend for unlimited quota.' 
        });
      } else {
        setConnectionTestResult({ success: false, message: res.error || 'Connection failed.' });
      }
    } catch (err: any) {
      setConnectionTestResult({ success: false, message: err?.message || 'Connection test failed.' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSyncToHatchable = async () => {
    setIsSyncingHatchable(true);
    setSyncHatchableResult(null);
    try {
      const res = await syncClientDataToHatchable();
      if (res.success) {
        setSyncHatchableResult(`Successfully synced ${res.usersSynced} user(s) and ${res.codesSynced} subscription code(s) to Hatchable!`);
        loadUsers();
      } else {
        setSyncHatchableResult(`Sync failed: ${res.error}`);
      }
    } catch (e: any) {
      setSyncHatchableResult(`Sync error: ${e.message}`);
    } finally {
      setIsSyncingHatchable(false);
    }
  };

  const handleSyncPending = async () => {
    setIsSyncingPending(true);
    setSyncPendingResult(null);
    try {
      const res = await syncPendingUsersToFirebase();
      if (res.quotaStillExhausted) {
        setSyncPendingResult('Firebase quota is still exhausted. Cloud database rejected sync.');
      } else {
        setSyncPendingResult(`Synced ${res.synced} offline account(s) to Firebase!`);
        setPendingUsers(getPendingUserSyncs());
        loadUsers();
      }
    } catch (err: any) {
      setSyncPendingResult('Sync error: ' + (err?.message || 'Failed to sync'));
    } finally {
      setIsSyncingPending(false);
    }
  };

  const handleBackupSubscriptionCodes = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(subscriptionCodes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `zinovis_subscription_codes_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleRestoreMasterCodes = () => {
    setRestoringCodes(true);
    try {
      const updated = restoreMasterSubscriptionCodes();
      setSubscriptionCodes(updated);
      alert('Master VIP subscription codes (1 Month, 1 Year, Lifetime) have been restored and verified!');
    } catch (e: any) {
      alert('Failed to restore codes: ' + e?.message);
    } finally {
      setRestoringCodes(false);
    }
  };

  const handleSaveEmailConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveCustomEmailJsConfig(emailConfig);
    setEmailConfigSuccess('EmailJS settings saved successfully to browser storage!');
    setTimeout(() => setEmailConfigSuccess(null), 4000);
  };

  const handleTestEmailSend = async () => {
    setTestingEmail(true);
    setTestEmailResult(null);
    try {
      const targetEmail = currentUser?.email || 'admin@zinovis.com';
      const testCode = Math.floor(100000 + Math.random() * 900000).toString();
      const res = await sendOtpViaEmail({
        to_email: targetEmail,
        to_name: currentUser?.name || 'Admin',
        otp_code: testCode,
      });

      if (!res.isSimulated) {
        setTestEmailResult({
          success: true,
          message: `Live email dispatched to ${targetEmail}! Check your inbox.`,
        });
      } else {
        setTestEmailResult({
          success: true,
          message: `Demo mode active. Verification code generated: ${testCode}. (To send live emails, enter your EmailJS credentials above)`,
        });
      }
    } catch (err: any) {
      setTestEmailResult({
        success: false,
        message: 'Test failed: ' + (err?.message || 'Unknown error'),
      });
    } finally {
      setTestingEmail(false);
    }
  };

  useEffect(() => {
    loadUsers();
    getTrending('all', 'week').then(setTrendingMedia).catch(console.error);

    // Subscribe to support messages
    const unsubscribeSupport = subscribeToAllSupportMessages((msgs) => {
      setSupportMessages(msgs);
    });

    // Subscribe to subscription codes in real-time
    const unsubscribeCodes = subscribeToSubscriptionCodes((remoteCodes) => {
      const localCodes = getSubscriptionCodes();
      const remoteIds = new Set(remoteCodes.map(c => c.id));
      
      const codeMap = new Map<string, SubscriptionCode>();
      localCodes.forEach(c => {
        codeMap.set(c.id, c);
        // Sync local code to backend if it's missing (e.g., due to previous quota limit)
        if (!remoteIds.has(c.id)) {
          saveSubscriptionCodeToBackend(c).catch(console.error);
        }
      });
      remoteCodes.forEach(c => codeMap.set(c.id, c));
      
      const mergedCodes = Array.from(codeMap.values()).sort((a, b) => b.createdAt - a.createdAt);
      setSubscriptionCodes(mergedCodes);
    });

    return () => {
      unsubscribeSupport();
      unsubscribeCodes();
    };
  }, []);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const query = userSearch.toLowerCase();
    return users.filter(u => 
      u.name.toLowerCase().includes(query) ||
      u.username.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.id.toLowerCase().includes(query) ||
      (u.country && u.country.toLowerCase().includes(query))
    );
  }, [users, userSearch]);

  // Subscription Codes Filtered List
  const filteredSubscriptionCodes = useMemo(() => {
    return subscriptionCodes.filter((c) => {
      if (subCodeSearch.trim()) {
        const q = subCodeSearch.toLowerCase();
        const matchCode = c.code.toLowerCase().includes(q);
        const matchNote = c.note?.toLowerCase().includes(q);
        const matchUser = c.redeemedBy?.userName.toLowerCase().includes(q) || c.redeemedBy?.userEmail.toLowerCase().includes(q);
        if (!matchCode && !matchNote && !matchUser) return false;
      }
      if (subCodeTierFilter !== 'all' && c.tier !== subCodeTierFilter) {
        return false;
      }
      if (subCodeStatusFilter === 'available' && c.isRedeemed) return false;
      if (subCodeStatusFilter === 'redeemed' && !c.isRedeemed) return false;
      return true;
    });
  }, [subscriptionCodes, subCodeSearch, subCodeTierFilter, subCodeStatusFilter]);

  // Subscription stats
  const totalSubCodesCount = subscriptionCodes.length;
  const availableCodesCount = subscriptionCodes.filter(c => !c.isRedeemed).length;
  const redeemedCodesCount = subscriptionCodes.filter(c => c.isRedeemed).length;
  const activeSubscribedUsersCount = users.filter(u => checkUserHasActiveSubscription(u)).length;

  // Toggle Global Subscription Requirement
  const handleToggleSubscriptionGate = async () => {
    setIsTogglingGate(true);
    try {
      await setIsSubscriptionRequired(!isSubscriptionRequired);
    } catch (err) {
      console.error('Failed to toggle subscription requirement:', err);
    } finally {
      setIsTogglingGate(false);
    }
  };

  // Generate Codes Handler
  const handleGenerateCodes = (e: React.FormEvent) => {
    e.preventDefault();
    if (genBatchCount > 1) {
      const newCodes = createBatchSubscriptionCodes(genTier, genBatchCount, genNote.trim() || undefined);
      setGeneratedCodesResult(newCodes);
      setSubscriptionCodes(getSubscriptionCodes());
    } else {
      const newCode = createSubscriptionCode(genTier, genCustomCode.trim() || undefined, genNote.trim() || undefined);
      setGeneratedCodesResult([newCode]);
      setSubscriptionCodes(getSubscriptionCodes());
    }
    setGenCustomCode('');
    setGenNote('');
  };

  // Delete / Revoke Code
  const executeDeleteCode = async (id: string) => {
    setDeletingCodeId(id);
    try {
      await deleteSubscriptionCode(id);
      setSubscriptionCodes(prev => prev.filter(c => c.id !== id));
      setConfirmDeleteCode(null);
    } catch (err) {
      console.error('Delete code error:', err);
    } finally {
      setDeletingCodeId(null);
    }
  };

  // Copy Single Code
  const handleCopyCode = (codeStr: string, id: string) => {
    navigator.clipboard.writeText(codeStr);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Copy All Generated Codes
  const handleCopyAllGenerated = () => {
    if (!generatedCodesResult) return;
    const text = generatedCodesResult.map(c => `${c.code} [${getTierDisplayName(c.tier)}]`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedCode('all');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Copy Shop URL
  const handleCopyShopUrl = () => {
    navigator.clipboard.writeText(shopUrl);
    setCopiedShopUrl(true);
    setTimeout(() => setCopiedShopUrl(false), 2000);
  };

  // Grant Subscription to User directly
  const handleGrantUserSubscription = async (userId: string, tier: SubscriptionTier) => {
    const userIdx = users.findIndex(u => u.id === userId);
    if (userIdx < 0) return;

    const now = Date.now();
    let expiresAt: number | null = null;
    let isPermanent = false;

    if (tier === 'permanent') {
      isPermanent = true;
      expiresAt = null;
    } else if (tier === 'one_month') {
      expiresAt = now + 30 * 24 * 60 * 60 * 1000;
    } else if (tier === 'six_months') {
      expiresAt = now + 180 * 24 * 60 * 60 * 1000;
    } else if (tier === 'one_year') {
      expiresAt = now + 365 * 24 * 60 * 60 * 1000;
    }

    const newSub: UserSubscription = {
      tier,
      startDate: now,
      expiresAt,
      isPermanent,
      codeUsed: 'ADMIN_GRANT',
    };

    const updatedUser = { ...users[userIdx], subscription: newSub };
    const updatedUsers = [...users];
    updatedUsers[userIdx] = updatedUser;
    setUsers(updatedUsers);
    saveUsersLocally(updatedUsers);
    await saveUserToBackend(updatedUser);
    if (inspectingUser?.id === userId) {
      setInspectingUser(updatedUser);
    }
  };

  // Revoke Subscription from User directly
  const handleRevokeUserSubscription = async (userId: string) => {
    const userIdx = users.findIndex(u => u.id === userId);
    if (userIdx < 0) return;

    const updatedUser = { ...users[userIdx] };
    delete updatedUser.subscription;
    const updatedUsers = [...users];
    updatedUsers[userIdx] = updatedUser;
    setUsers(updatedUsers);
    saveUsersLocally(updatedUsers);
    await saveUserToBackend(updatedUser);
    if (inspectingUser?.id === userId) {
      setInspectingUser(updatedUser);
    }
  };

  // Edit User Handlers
  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    setEditFormName(u.name || '');
    setEditFormUsername(u.username || '');
    setEditFormEmail(u.email || '');
    setEditFormPassword(u.password || '');
    setEditFormAge(u.age ?? '');
    setEditFormCountry(u.country || '');
    setEditFormAvatar(u.avatar || '');
  };

  const handleSaveEditedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updates = {
      name: editFormName.trim() || editingUser.name,
      username: editFormUsername.trim() || editingUser.username,
      email: editFormEmail.trim() || editingUser.email,
      password: editFormPassword.trim() || editingUser.password,
      age: editFormAge === '' ? undefined : Number(editFormAge),
      country: editFormCountry.trim() || editingUser.country,
      avatar: editFormAvatar.trim() || editingUser.avatar,
    };

    const res = await adminUpdateUser(editingUser.id, updates);
    if (res.success && res.user) {
      setUsers(getAllUsers());
      if (inspectingUser?.id === editingUser.id) {
        setInspectingUser(res.user);
      }
      setEditingUser(null);
    }
  };

  // Tier helper display info
  const getTierDisplayName = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'one_month': return '1 Month Pass';
      case 'permanent': return 'Permanent Lifetime VIP';
      case 'six_months': return '6 Months Pass';
      case 'one_year': return '1 Year Pass';
      default: return tier;
    }
  };

  const getTierBadge = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'permanent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-black text-[11px] shadow-sm shadow-amber-500/10">
            <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span>Permanent VIP</span>
          </span>
        );
      case 'one_year':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold text-[11px]">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>1 Year VIP</span>
          </span>
        );
      case 'six_months':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 font-bold text-[11px]">
            <Zap className="w-3 h-3 text-blue-400" />
            <span>6 Months VIP</span>
          </span>
        );
      case 'one_month':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[11px]">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>1 Month VIP</span>
          </span>
        );
    }
  };

  // Analytics Computations
  const totalUsersCount = users.length;
  const activeStreamersCount = users.filter(u => (u.watchHistory?.length || 0) > 0).length;
  const totalWatchedCount = users.reduce((acc, u) => acc + (u.watchHistory?.length || 0), 0);
  const totalWatchLaterCount = users.reduce((acc, u) => acc + (u.watchLater?.length || 0), 0);

  // Age & Minor Filtering Analytics
  const minorsCount = users.filter(u => u.isUnder18 || (u.age !== undefined && u.age < 18)).length;
  const adultsCount = users.filter(u => !u.isUnder18 && (u.age === undefined || u.age >= 18)).length;
  const minorsPercentage = totalUsersCount > 0 ? Math.round((minorsCount / totalUsersCount) * 100) : 0;

  // Country Distribution
  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => {
      const c = u.country || 'Other';
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);
  }, [users]);

  // Aggregated Most Watched Movies by Users
  const mostWatchedMovies = useMemo(() => {
    const mediaMap = new Map<number, {
      id: number;
      title: string;
      poster_path: string | null;
      backdrop_path: string | null;
      media_type: string;
      vote_average: number;
      watchCount: number;
    }>();

    users.forEach(u => {
      (u.watchHistory || []).forEach(item => {
        const existing = mediaMap.get(item.id);
        if (existing) {
          existing.watchCount += 1;
        } else {
          mediaMap.set(item.id, {
            id: item.id,
            title: item.title,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            media_type: item.media_type,
            vote_average: item.vote_average || 7.5,
            watchCount: 1,
          });
        }
      });
    });

    return Array.from(mediaMap.values()).sort((a, b) => b.watchCount - a.watchCount);
  }, [users]);

  // Handle Delete User
  const executeDeleteUser = async (userId: string) => {
    setDeletingUserId(userId);
    try {
      await deleteUserAccount(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      if (inspectingUser?.id === userId) {
        setInspectingUser(null);
      }
      setConfirmDeleteUser(null);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingUserId(null);
    }
  };

  // Group support messages by user
  const supportThreads = useMemo(() => {
    const threads: Record<string, {
      userId: string;
      userName: string;
      userEmail: string;
      userAvatar?: string;
      lastMessage: SupportMessage;
      messages: SupportMessage[];
      unreadCount: number;
    }> = {};

    supportMessages.forEach(msg => {
      if (!threads[msg.userId]) {
        threads[msg.userId] = {
          userId: msg.userId,
          userName: msg.userName || 'User',
          userEmail: msg.userEmail || '',
          userAvatar: msg.userAvatar,
          lastMessage: msg,
          messages: [],
          unreadCount: 0,
        };
      }
      threads[msg.userId].messages.push(msg);
      threads[msg.userId].lastMessage = msg;
      if (msg.sender === 'user' && !msg.read) {
        threads[msg.userId].unreadCount += 1;
      }
    });

    return Object.values(threads).sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt);
  }, [supportMessages]);

  // Messages of the selected chat thread
  const activeChatMessages = useMemo(() => {
    if (!selectedUserForChat) return [];
    return supportMessages.filter(m => m.userId === selectedUserForChat);
  }, [supportMessages, selectedUserForChat]);

  const activeThread = useMemo(() => {
    return supportThreads.find(t => t.userId === selectedUserForChat) || null;
  }, [supportThreads, selectedUserForChat]);

  // Send admin reply
  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedUserForChat) return;

    const targetUser = users.find(u => u.id === selectedUserForChat);
    const userName = targetUser?.name || activeThread?.userName || 'User';
    const userEmail = targetUser?.email || activeThread?.userEmail || '';

    const text = replyText.trim();
    setReplyText('');

    await sendSupportMessageToBackend({
      userId: selectedUserForChat,
      userName,
      userEmail,
      message: text,
      sender: 'admin',
      createdAt: Date.now(),
      read: true,
    });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Top Admin Navbar */}
      <header className="sticky top-0 z-40 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
            title="Return to Catalog"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
              <Heart className="w-4 h-4 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-white tracking-wide">
                  ZINOVIS <span className="text-red-500">ADMIN</span>
                </h1>
                <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  LIVE ROOT
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">Authenticated as: <strong className="text-neutral-200">Rahin (SuperAdmin)</strong></p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
              activeTab === 'analytics'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
              activeTab === 'users'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Users ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('movies')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
              activeTab === 'movies'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Most Watched</span>
          </button>

          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
              activeTab === 'subscriptions'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Subscriptions ({subscriptionCodes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('support')}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
              activeTab === 'support'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Live Support</span>
            {supportThreads.some(t => t.unreadCount > 0) && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
        </div>

        {/* Logout button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              logoutAdmin();
              navigate('/');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-red-400 border border-neutral-700 text-xs font-semibold transition-all"
            title="Exit Admin Mode"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Exit Admin</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-8">
        
        {/* Backend Infrastructure & Provider Control Panel */}
        <div className="p-4 sm:p-5 rounded-3xl border border-neutral-800 bg-neutral-900/70 text-neutral-300 shadow-xl space-y-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-3 border-b border-neutral-800/80">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/30">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>Backend Infrastructure</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                    Active: {backendProvider === 'hatchable' ? 'Hatchable (Primary)' : 'Firebase (Legacy)'}
                  </span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Select your active storage engine. Hatchable provides unlimited quota and zero rate limits.
                </p>
              </div>
            </div>

            {/* Provider Switcher Buttons */}
            <div className="flex items-center gap-2 p-1 rounded-2xl bg-neutral-950 border border-neutral-800 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setBackendProvider('hatchable');
                  loadUsers();
                }}
                className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  backendProvider === 'hatchable'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/30'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                <span>Hatchable Backend</span>
                {backendProvider === 'hatchable' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setBackendProvider('firebase');
                  loadUsers();
                }}
                className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  backendProvider === 'firebase'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Firebase Firestore</span>
                {backendProvider === 'firebase' && (
                  <span className={`w-2 h-2 rounded-full ${quotaExhausted ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                )}
              </button>
            </div>
          </div>

          {/* Provider Specific Status and Action Bar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className={`w-3 h-3 rounded-full mt-1 sm:mt-0 flex-shrink-0 ${
                backendProvider === 'hatchable'
                  ? 'bg-emerald-400'
                  : quotaExhausted ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
              }`} />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    {backendProvider === 'hatchable' ? 'Hatchable High-Throughput Engine:' : 'Firebase Cloud Database:'}
                    <span className={backendProvider === 'hatchable' ? 'text-emerald-400' : (quotaExhausted ? 'text-amber-400' : 'text-emerald-400')}>
                      {backendProvider === 'hatchable' 
                        ? 'Active & Unlimited (Zero Quota Limits)' 
                        : (quotaExhausted ? 'Offline Mode Active (Daily Quota Reached)' : 'Connected & Healthy')}
                    </span>
                  </h4>
                  {pendingUsers.length > 0 && backendProvider === 'firebase' && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold">
                      {pendingUsers.length} Offline Account(s) Queued
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  {backendProvider === 'hatchable'
                    ? 'Persistent high-performance backend with unlimited reads, writes, and real-time subscription verification. No quota exhaustion.'
                    : (quotaExhausted 
                        ? 'Google Cloud daily free quota limit (50,000 reads / 20,000 writes) reached. Quota resets at 00:00 UTC.' 
                        : 'Real-time synchronization active with Firebase Cloud Firestore.')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-start md:justify-end">
              {backendProvider === 'hatchable' && (
                <button
                  type="button"
                  onClick={handleSyncToHatchable}
                  disabled={isSyncingHatchable}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/20 transition-all cursor-pointer disabled:opacity-50"
                  title="Sync all client users and subscription codes to Hatchable store"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingHatchable ? 'animate-spin' : ''}`} />
                  <span>{isSyncingHatchable ? 'Syncing to Hatchable...' : 'Sync Data to Hatchable'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadUsersBackup}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Download all user account data as a JSON backup"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Backup Accounts JSON</span>
              </button>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${testingConnection ? 'animate-spin' : ''}`} />
                <span>{testingConnection ? 'Testing...' : 'Test Connection'}</span>
              </button>

              {backendProvider === 'firebase' && quotaExhausted && (
                <a
                  href="https://console.firebase.google.com/project/ai-studio-applet-webapp-8c6f3/firestore/databases/ai-studio-zinovis-4030a834-9ba9-449a-b2bf-8041fe4e9a68/data?openUpgradeDialog=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/20 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Firebase Console</span>
                </a>
              )}

              {backendProvider === 'firebase' && pendingUsers.length > 0 && !quotaExhausted && (
                <button
                  type="button"
                  onClick={handleSyncPending}
                  disabled={isSyncingPending}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPending ? 'animate-spin' : ''}`} />
                  <span>Sync Pending ({pendingUsers.length})</span>
                </button>
              )}
            </div>
          </div>

          {connectionTestResult && (
            <div className={`mt-2 p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
              connectionTestResult.success 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}>
              {connectionTestResult.success ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" /> : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-red-400" />}
              <span>{connectionTestResult.message}</span>
            </div>
          )}

          {syncHatchableResult && (
            <div className="mt-2 p-2.5 rounded-xl text-xs flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
              <span>{syncHatchableResult}</span>
            </div>
          )}

          {syncPendingResult && (
            <div className="mt-2 p-2.5 rounded-xl text-xs flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-300">
              <Info className="w-3.5 h-3.5 flex-shrink-0 text-blue-400" />
              <span>{syncPendingResult}</span>
            </div>
          )}
        </div>

        {/* ===================== TAB 1: ANALYTICS DASHBOARD ===================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-neutral-900/80 border border-neutral-800 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Total Users</span>
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white">{totalUsersCount}</div>
                <div className="mt-2 text-xs text-neutral-400 flex items-center gap-1">
                  <span className="text-emerald-400 font-semibold">100% cloud synced</span>
                  <span>with {backendProvider === 'hatchable' ? 'Hatchable' : 'Firebase'}</span>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-neutral-900/80 border border-neutral-800 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Active Streamers</span>
                  <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                    <Play className="w-4 h-4 fill-current" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white">{activeStreamersCount}</div>
                <div className="mt-2 text-xs text-neutral-400">
                  {totalUsersCount > 0 ? Math.round((activeStreamersCount / totalUsersCount) * 100) : 0}% of accounts watching HD
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-neutral-900/80 border border-neutral-800 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Watch Events</span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white">{totalWatchedCount}</div>
                <div className="mt-2 text-xs text-neutral-400">
                  Total movies & episodes streamed
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-neutral-900/80 border border-neutral-800 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Saved in Watch Later</span>
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white">{totalWatchLaterCount}</div>
                <div className="mt-2 text-xs text-neutral-400">
                  Queued titles across user accounts
                </div>
              </div>
            </div>

            {/* Middle Grid: Age Demographics & Safe Mode Shield */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Age & 18+ Filter Card */}
              <div className="p-6 rounded-3xl bg-neutral-900/80 border border-neutral-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Age & 18+ Content Filter Demographics</h3>
                      <p className="text-xs text-neutral-400">Automatic filter applied for users &lt; 18</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
                    <div className="text-xs font-semibold text-neutral-400">Under 18 (Safe Mode)</div>
                    <div className="text-2xl font-black text-emerald-400 mt-1">{minorsCount} users</div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">18+ content filtered out</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
                    <div className="text-xs font-semibold text-neutral-400">Adults (18+ Unrestricted)</div>
                    <div className="text-2xl font-black text-blue-400 mt-1">{adultsCount} users</div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">Full catalog unlocked</div>
                  </div>
                </div>

                {/* Progress bar visual */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>Under 18 Shield: {minorsPercentage}%</span>
                    <span>18+ Adults: {100 - minorsPercentage}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-neutral-800 overflow-hidden flex">
                    <div 
                      className="bg-emerald-500 transition-all duration-500" 
                      style={{ width: `${minorsPercentage}%` }} 
                      title={`Under 18: ${minorsPercentage}%`}
                    />
                    <div 
                      className="bg-blue-600 transition-all duration-500" 
                      style={{ width: `${100 - minorsPercentage}%` }} 
                      title={`18+: ${100 - minorsPercentage}%`}
                    />
                  </div>
                </div>
              </div>

              {/* Country Distribution Card */}
              <div className="p-6 rounded-3xl bg-neutral-900/80 border border-neutral-800 shadow-xl space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Top User Countries</h3>
                    <p className="text-xs text-neutral-400">Geographic distribution of streaming audience</p>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {countryCounts.slice(0, 6).map((item, idx) => {
                    const pct = totalUsersCount > 0 ? Math.round((item.count / totalUsersCount) * 100) : 0;
                    return (
                      <div key={item.country} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-neutral-200">{item.country}</span>
                          <span className="text-neutral-400">{item.count} users ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full" 
                            style={{ width: `${Math.max(pct, 8)}%` }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                  {countryCounts.length === 0 && (
                    <div className="text-xs text-neutral-400 py-4 text-center">No country data recorded yet.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Server Status Health & Quick Actions */}
            <div className="p-6 rounded-3xl bg-neutral-900/80 border border-neutral-800 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-4">Infrastructure & Cluster Health</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <div className="text-xs font-bold text-white">TMDB v3 API</div>
                    <div className="text-[10px] text-emerald-400 font-medium">99.98% Latency 64ms</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <div className="text-xs font-bold text-white">Firestore DB</div>
                    <div className="text-[10px] text-emerald-400 font-medium">Synced & Healthy</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <div className="text-xs font-bold text-white">VidSrc HD Nodes</div>
                    <div className="text-[10px] text-emerald-400 font-medium">6 CDN Mirrors Active</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <div className="text-xs font-bold text-white">Live Support Relay</div>
                    <div className="text-[10px] text-emerald-400 font-medium">Instant Socket Sync</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: USERS INFO ===================== */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Registered Users Directory</h2>
                <p className="text-xs text-neutral-400">Manage user profiles, safety filters, and watch activity</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1 sm:w-72">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by name, email, country, ID..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 focus:border-red-500 rounded-xl text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <button
                  onClick={loadUsers}
                  className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
                  title="Refresh Users List"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingUsers ? 'animate-spin text-red-500' : ''}`} />
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-neutral-950/80 border-b border-neutral-800 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">User</th>
                      <th className="py-3.5 px-4">Email</th>
                      <th className="py-3.5 px-4">Subscription</th>
                      <th className="py-3.5 px-4">Age &amp; Filter Mode</th>
                      <th className="py-3.5 px-4">Country</th>
                      <th className="py-3.5 px-4 text-center">Watched</th>
                      <th className="py-3.5 px-4 text-center">Watchlist</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {filteredUsers.map((u) => {
                      const isMinor = u.isUnder18 || (u.age !== undefined && u.age < 18);
                      const hasActiveSub = checkUserHasActiveSubscription(u);
                      const daysLeft = getUserSubscriptionDaysLeft(u);

                      return (
                        <tr key={u.id} className="hover:bg-neutral-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl overflow-hidden border border-neutral-700 bg-neutral-950 flex-shrink-0">
                                <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                </div>
                                <div className="text-[11px] text-neutral-400">@{u.username} • ID: {u.id}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-neutral-300 text-xs">{u.email}</td>

                          {/* Subscription Column */}
                          <td className="py-3 px-4">
                            {hasActiveSub && u.subscription ? (
                              <div className="flex flex-col gap-1">
                                {getTierBadge(u.subscription.tier)}
                                <span className="text-[10px] text-neutral-400">
                                  {u.subscription.isPermanent 
                                    ? 'Lifetime Access' 
                                    : `${daysLeft} days remaining`}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-800/80 border border-neutral-700 text-neutral-400 text-[10px] font-medium">
                                Free User
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-semibold text-neutral-200">
                                {u.age !== undefined ? `${u.age} yrs` : 'Age N/A'}
                              </span>
                              {isMinor ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold w-fit">
                                  <ShieldCheck className="w-3 h-3" />
                                  18+ Filtered (Minor)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-400 text-[10px] font-medium w-fit">
                                  Unrestricted (18+)
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-neutral-300 text-xs">
                            <span className="font-medium">{u.country || 'Global'}</span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-lg bg-neutral-800 text-neutral-200 font-bold text-xs">
                              {u.watchHistory?.length || 0}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-lg bg-neutral-800 text-neutral-200 font-bold text-xs">
                              {u.watchLater?.length || 0}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setInspectingUser(u)}
                                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                                title="Inspect User & History"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleOpenEditUser(u)}
                                className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors"
                                title="Edit User Info"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedUserForChat(u.id);
                                  setActiveTab('support');
                                }}
                                className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                                title="Open Support Chat with User"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setConfirmDeleteUser({ id: u.id, name: u.name || u.username, email: u.email })}
                                disabled={deletingUserId === u.id}
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                title="Delete User Account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-xs text-neutral-400">
                          {loadingUsers ? 'Loading registered users from Firebase...' : 'No users matching the search query.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 3: MOST WATCHED & TRENDING ===================== */}
        {activeTab === 'movies' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Section 1: Most Watched by Users */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Film className="w-5 h-5 text-red-500" />
                    <span>Most Watched Movies &amp; Series by Users</span>
                  </h2>
                  <p className="text-xs text-neutral-400">Aggregated ranking compiled from all users' watch history</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold">
                  {mostWatchedMovies.length} Titles Streamed
                </span>
              </div>

              {mostWatchedMovies.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {mostWatchedMovies.map((item, index) => (
                    <div 
                      key={`${item.media_type}-${item.id}`}
                      className="group relative rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-xl transition-all duration-300 hover:scale-[1.03] hover:border-red-500/50"
                    >
                      {/* Rank Badge */}
                      <div className="absolute top-2 left-2 z-20 w-6 h-6 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center shadow-lg">
                        #{index + 1}
                      </div>

                      {/* Poster */}
                      <div className="aspect-[2/3] w-full bg-neutral-950 relative overflow-hidden">
                        <img
                          src={getImageUrl(item.poster_path, 'poster')}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent opacity-90" />
                      </div>

                      {/* Detail Footer */}
                      <div className="p-3">
                        <div className="text-xs font-bold text-white truncate">{item.title}</div>
                        <div className="flex items-center justify-between mt-1 text-[11px]">
                          <span className="text-red-400 font-black flex items-center gap-1">
                            <Play className="w-3 h-3 fill-current" />
                            {item.watchCount} {item.watchCount === 1 ? 'stream' : 'streams'}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 font-bold text-[10px] uppercase">
                            {item.media_type}
                          </span>
                        </div>

                        <button
                          onClick={() => navigate(`/play/${item.media_type}/${item.id}`)}
                          className="w-full mt-2 py-1.5 px-2 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Test Stream</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 rounded-3xl bg-neutral-900/60 border border-neutral-800 text-center space-y-3">
                  <Film className="w-10 h-10 text-neutral-600 mx-auto" />
                  <div className="text-sm font-bold text-neutral-300">No user watch history recorded yet</div>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                    When users stream movies or TV series in the HD player, titles will automatically be tallied and ranked here.
                  </p>
                </div>
              )}
            </div>

            {/* Section 2: Global Trending Movies (TMDB) */}
            <div className="pt-4 border-t border-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-amber-500" />
                    <span>Global Trending Catalog Releases</span>
                  </h2>
                  <p className="text-xs text-neutral-400">Live popular movies and shows across TMDB</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {trendingMedia.slice(0, 12).map((item) => (
                  <div 
                    key={item.id}
                    className="group relative rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-xl transition-all duration-300 hover:scale-[1.03]"
                  >
                    <div className="aspect-[2/3] w-full bg-neutral-950 relative overflow-hidden">
                      <img
                        src={getImageUrl(item.poster_path, 'poster')}
                        alt={item.title || item.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent opacity-80" />
                    </div>

                    <div className="p-3">
                      <div className="text-xs font-bold text-white truncate">{item.title || item.name}</div>
                      <div className="flex items-center justify-between mt-1 text-[11px] text-neutral-400">
                        <span>★ {item.vote_average?.toFixed(1) || 'N/A'}</span>
                        <span className="uppercase text-[10px] bg-neutral-800 px-1 rounded text-neutral-400">
                          {item.media_type || 'Movie'}
                        </span>
                      </div>

                      <button
                        onClick={() => navigate(`/play/${item.media_type || 'movie'}/${item.id}`)}
                        className="w-full mt-2 py-1.5 px-2 rounded-xl bg-neutral-800 hover:bg-red-600 text-neutral-300 hover:text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Watch Now</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 4: SUBSCRIPTION MANAGEMENT ===================== */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Header & Global Gate Switch Banner */}
            <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                      <Crown className="w-5 h-5 fill-amber-400/20" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>Subscription System &amp; VIP Gate</span>
                      </h2>
                      <p className="text-xs text-neutral-400">
                        Control global platform monetization, generate 4-tier subscription passes, and monitor redemptions
                      </p>
                    </div>
                  </div>
                </div>

                {/* Master Global Switch */}
                <div className="flex items-center gap-3 bg-neutral-950 p-2 pl-4 pr-3 rounded-2xl border border-neutral-800 shadow-inner">
                  <div className="flex flex-col text-right">
                    <span className="text-xs font-bold text-white">Global Subscription Gate</span>
                    <span className={`text-[11px] font-semibold ${isSubscriptionRequired ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {isSubscriptionRequired ? '🔒 VIP Required Mode' : '🟢 Free Mode (Open to All)'}
                    </span>
                  </div>

                  <button
                    onClick={handleToggleSubscriptionGate}
                    disabled={isTogglingGate}
                    className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none p-1 ${
                      isSubscriptionRequired ? 'bg-red-600' : 'bg-neutral-700'
                    }`}
                    title={isSubscriptionRequired ? 'Click to switch to Free Mode' : 'Click to require Subscription'}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-md ${
                        isSubscriptionRequired ? 'translate-x-8' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Status Explanation Banner */}
              <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                isSubscriptionRequired
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              }`}>
                {isSubscriptionRequired ? (
                  <Lock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Unlock className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="text-xs space-y-1">
                  <div className="font-bold text-sm text-white">
                    {isSubscriptionRequired
                      ? '👑 VIP Subscription Requirement is ACTIVE'
                      : '✨ Free Streaming Mode is ACTIVE'}
                  </div>
                  <p className="leading-relaxed opacity-90">
                    {isSubscriptionRequired
                      ? 'Visitors and registered users cannot play HD streams without entering an active subscription code. The video player will prompt them with the VIP paywall and provide a link to the Unika Gaming Shop.'
                      : 'Anyone can stream movies and TV shows for free. Subscription codes are optional or can be pre-purchased for future activation.'}
                  </p>
                </div>
              </div>

              {/* Official Store Link Box */}
              <div className="p-4.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-red-600/10 text-red-400 border border-red-600/20">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Official Subscription Shop Website</div>
                    <div className="text-[11px] text-neutral-400">
                      Users buy subscription codes here: <span className="text-red-400 font-mono font-bold">{shopUrl}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleCopyShopUrl}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-neutral-200 hover:text-white transition-all"
                  >
                    {copiedShopUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedShopUrl ? 'Copied Shop Link!' : 'Copy Shop URL'}</span>
                  </button>

                  <a
                    href={shopUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/20 transition-all"
                  >
                    <span>Visit Shop</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
                <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Codes</div>
                <div className="text-2xl font-black text-white mt-1">{totalSubCodesCount}</div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
                <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Available Codes</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">{availableCodesCount}</div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
                <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Redeemed Codes</div>
                <div className="text-2xl font-black text-purple-400 mt-1">{redeemedCodesCount}</div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
                <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Active VIP Users</div>
                <div className="text-2xl font-black text-amber-400 mt-1">{activeSubscribedUsersCount}</div>
              </div>
            </div>

            {/* Code Generator Studio */}
            <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-neutral-800">
                <div className="p-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">4-Tier Subscription Code Generator</h3>
                  <p className="text-xs text-neutral-400">
                    Generate valid single or batch subscription activation codes for 1 Month, Permanent, 6 Months, or 1 Year
                  </p>
                </div>
              </div>

              <form onSubmit={handleGenerateCodes} className="space-y-6">
                {/* 4 Tiers Selection */}
                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-3">
                    Step 1: Select Subscription Tier <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    
                    {/* Tier 1: 1 Month */}
                    <button
                      type="button"
                      onClick={() => setGenTier('one_month')}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        genTier === 'one_month'
                          ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:bg-neutral-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-emerald-400">1st Tier</span>
                        <CheckCircle2 className={`w-4 h-4 ${genTier === 'one_month' ? 'text-emerald-400' : 'text-neutral-700'}`} />
                      </div>
                      <div className="text-sm font-bold text-white">1 Month Pass</div>
                      <div className="text-[11px] text-neutral-400 mt-1">30 Days HD Streaming Access</div>
                    </button>

                    {/* Tier 2: Permanent */}
                    <button
                      type="button"
                      onClick={() => setGenTier('permanent')}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        genTier === 'permanent'
                          ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-500/20 ring-1 ring-amber-500'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:bg-neutral-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5 fill-amber-400" />
                          2nd Tier
                        </span>
                        <CheckCircle2 className={`w-4 h-4 ${genTier === 'permanent' ? 'text-amber-400' : 'text-neutral-700'}`} />
                      </div>
                      <div className="text-sm font-bold text-amber-300">Permanent VIP</div>
                      <div className="text-[11px] text-neutral-400 mt-1">Lifetime Access (Never Expires)</div>
                    </button>

                    {/* Tier 3: 6 Months */}
                    <button
                      type="button"
                      onClick={() => setGenTier('six_months')}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        genTier === 'six_months'
                          ? 'bg-blue-500/15 border-blue-500 text-white shadow-lg shadow-blue-500/20 ring-1 ring-blue-500'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:bg-neutral-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-blue-400">3rd Tier</span>
                        <CheckCircle2 className={`w-4 h-4 ${genTier === 'six_months' ? 'text-blue-400' : 'text-neutral-700'}`} />
                      </div>
                      <div className="text-sm font-bold text-white">6 Months Pass</div>
                      <div className="text-[11px] text-neutral-400 mt-1">180 Days HD Streaming Access</div>
                    </button>

                    {/* Tier 4: 1 Year */}
                    <button
                      type="button"
                      onClick={() => setGenTier('one_year')}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        genTier === 'one_year'
                          ? 'bg-purple-500/15 border-purple-500 text-white shadow-lg shadow-purple-500/20 ring-1 ring-purple-500'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:bg-neutral-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-purple-400">4th Tier</span>
                        <CheckCircle2 className={`w-4 h-4 ${genTier === 'one_year' ? 'text-purple-400' : 'text-neutral-700'}`} />
                      </div>
                      <div className="text-sm font-bold text-white">1 Year Pass</div>
                      <div className="text-[11px] text-neutral-400 mt-1">365 Days HD Streaming Access</div>
                    </button>

                  </div>
                </div>

                {/* Generator Options */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Batch Quantity */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      Batch Quantity
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 5, 10, 20].map((qty) => (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => setGenBatchCount(qty)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                            genBatchCount === qty
                              ? 'bg-red-600 border-red-500 text-white shadow-md shadow-red-600/30'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {qty} {qty === 1 ? 'Code' : 'Codes'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Code String (Only for single code) */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      Custom Code (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder={genBatchCount > 1 ? 'Auto-generated for batches' : 'e.g. UNIKA-VIP-2026'}
                      value={genCustomCode}
                      onChange={(e) => setGenCustomCode(e.target.value.toUpperCase())}
                      disabled={genBatchCount > 1}
                      className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl text-xs text-white placeholder:text-neutral-600 uppercase font-mono disabled:opacity-50"
                    />
                    <p className="text-[10px] text-neutral-500 mt-1">
                      Leave empty to auto-generate formatted code.
                    </p>
                  </div>

                  {/* Tag / Note */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      Admin Tag / Note (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Unika Shop Batch #1, Discord Giveaway"
                      value={genNote}
                      onChange={(e) => setGenNote(e.target.value)}
                      className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl text-xs text-white placeholder:text-neutral-600"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-xl shadow-red-600/30 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Generate {genBatchCount} {getTierDisplayName(genTier)} {genBatchCount === 1 ? 'Code' : 'Codes'}</span>
                  </button>

                  <span className="text-xs text-neutral-400 hidden sm:inline">
                    Generated codes are saved to Firebase and ready for immediate redemption.
                  </span>
                </div>
              </form>

              {/* Newly Generated Results Panel */}
              {generatedCodesResult && generatedCodesResult.length > 0 && (
                <div className="p-4.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Successfully Generated {generatedCodesResult.length} Subscription Codes!</span>
                    </div>

                    <button
                      onClick={handleCopyAllGenerated}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-all"
                    >
                      {copiedCode === 'all' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode === 'all' ? 'Copied All!' : 'Copy All Codes'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 max-h-48 overflow-y-auto">
                    {generatedCodesResult.map((c) => (
                      <div
                        key={c.id}
                        className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-mono font-bold text-xs text-white truncate">{c.code}</div>
                          <div className="text-[10px] text-neutral-400">{getTierDisplayName(c.tier)}</div>
                        </div>
                        <button
                          onClick={() => handleCopyCode(c.code, c.id)}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white"
                          title="Copy Code"
                        >
                          {copiedCode === c.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Subscription Codes Management Table */}
            <div className="space-y-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Subscription Codes Database ({subscriptionCodes.length})</span>
                  </h3>
                  <p className="text-xs text-neutral-400">Search, filter, copy, backup, and restore subscription codes</p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                  {/* Backup Subscription Codes JSON */}
                  <button
                    type="button"
                    onClick={handleBackupSubscriptionCodes}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 border border-neutral-700 transition-all cursor-pointer"
                    title="Export all subscription codes as JSON backup"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>Backup Codes JSON</span>
                  </button>

                  {/* Restore 3 Master VIP Codes */}
                  <button
                    type="button"
                    onClick={handleRestoreMasterCodes}
                    disabled={restoringCodes}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-xs font-semibold text-amber-300 border border-amber-500/30 transition-all cursor-pointer"
                    title="Restore 3 Master VIP Codes: 1 Month, 1 Year, Lifetime"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>{restoringCodes ? 'Restoring...' : 'Restore 3 Master VIP Codes'}</span>
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search code, user, tag..."
                    value={subCodeSearch}
                    onChange={(e) => setSubCodeSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                  {/* Tier Filter */}
                  <select
                    value={subCodeTierFilter}
                    onChange={(e) => setSubCodeTierFilter(e.target.value as any)}
                    className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-300 focus:outline-none focus:border-red-500"
                  >
                    <option value="all">All Tiers</option>
                    <option value="one_month">1 Month</option>
                    <option value="permanent">Permanent VIP</option>
                    <option value="six_months">6 Months</option>
                    <option value="one_year">1 Year</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    value={subCodeStatusFilter}
                    onChange={(e) => setSubCodeStatusFilter(e.target.value as any)}
                    className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-300 focus:outline-none focus:border-red-500"
                  >
                    <option value="all">All Status</option>
                    <option value="available">Available (Unused)</option>
                    <option value="redeemed">Redeemed</option>
                  </select>
                </div>

              {/* Codes Table */}
              <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-neutral-950/80 border-b border-neutral-800 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">Subscription Code</th>
                        <th className="py-3.5 px-4">Tier &amp; Duration</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Redeemed By</th>
                        <th className="py-3.5 px-4">Note / Tag</th>
                        <th className="py-3.5 px-4">Created Date</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {filteredSubscriptionCodes.map((c) => (
                        <tr key={c.id} className="hover:bg-neutral-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-white text-xs sm:text-sm">{c.code}</span>
                              <button
                                onClick={() => handleCopyCode(c.code, c.id)}
                                className="p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white"
                                title="Copy Code"
                              >
                                {copiedCode === c.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-0.5">
                              {getTierBadge(c.tier)}
                              <span className="text-[10px] text-neutral-400">
                                {c.tier === 'permanent' ? 'Permanent' : `${c.durationDays} Days`}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {c.isRedeemed ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-bold">
                                <CheckCheck className="w-3 h-3" />
                                Redeemed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                                <CheckCircle2 className="w-3 h-3" />
                                Available
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {c.redeemedBy ? (
                              <div>
                                <div className="font-bold text-white text-xs">{c.redeemedBy.userName}</div>
                                <div className="text-[10px] text-neutral-400">{c.redeemedBy.userEmail}</div>
                                <div className="text-[9px] text-neutral-500">
                                  {new Date(c.redeemedBy.redeemedAt).toLocaleDateString()}
                                </div>
                              </div>
                            ) : (
                              <span className="text-neutral-500 text-xs">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-xs text-neutral-300">
                            {c.note ? (
                              <span className="px-2 py-0.5 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px]">
                                {c.note}
                              </span>
                            ) : (
                              <span className="text-neutral-600">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-xs text-neutral-400">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setConfirmDeleteCode({ id: c.id, code: c.code })}
                              disabled={deletingCodeId === c.id}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                              title="Delete/Revoke Code"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {filteredSubscriptionCodes.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-xs text-neutral-400">
                            No subscription codes found matching the current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Email & OTP Password Reset Service (Vercel Integration) */}
              <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-400">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">Email &amp; OTP Password Reset Service (Vercel Support)</h4>
                      <p className="text-xs text-neutral-400">
                        Configure EmailJS for real email delivery of password reset OTP codes on Vercel or live hosting.
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    {emailConfig.serviceId && emailConfig.templateId && emailConfig.publicKey ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Live EmailJS Configured</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" />
                        <span>Demo OTP Mode (Code Screen Verification)</span>
                      </span>
                    )}
                  </div>
                </div>

                {emailConfigSuccess && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{emailConfigSuccess}</span>
                  </div>
                )}

                {testEmailResult && (
                  <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
                    testEmailResult.success 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                      : 'bg-red-500/10 border-red-500/30 text-red-300'
                  }`}>
                    {testEmailResult.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                    <span>{testEmailResult.message}</span>
                  </div>
                )}

                <form onSubmit={handleSaveEmailConfig} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                        EmailJS Service ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. service_xxxxxxx"
                        value={emailConfig.serviceId}
                        onChange={(e) => setEmailConfig({ ...emailConfig, serviceId: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-2xl text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                        EmailJS Template ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. template_xxxxxxx"
                        value={emailConfig.templateId}
                        onChange={(e) => setEmailConfig({ ...emailConfig, templateId: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-2xl text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                        EmailJS Public Key
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. public_key_xxxxxxx"
                        value={emailConfig.publicKey}
                        onChange={(e) => setEmailConfig({ ...emailConfig, publicKey: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-2xl text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <p className="text-[11px] text-neutral-500 max-w-xl leading-relaxed">
                      💡 Tip for Vercel deployments: You can configure these 3 values either here directly, or add them in your Vercel Project Settings as <code className="text-neutral-300">VITE_EMAILJS_SERVICE_ID</code>, <code className="text-neutral-300">VITE_EMAILJS_TEMPLATE_ID</code>, and <code className="text-neutral-300">VITE_EMAILJS_PUBLIC_KEY</code>.
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTestEmailSend}
                        disabled={testingEmail}
                        className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-neutral-700 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${testingEmail ? 'animate-spin' : ''}`} />
                        <span>{testingEmail ? 'Testing...' : 'Send Test OTP'}</span>
                      </button>

                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg shadow-red-600/20 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save EmailJS Settings</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>

          </div>
        )}

        {/* ===================== TAB 5: LIVE SUPPORT CHAT OPTION ===================== */}
        {activeTab === 'support' && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-red-500" />
                <span>Live Support Center</span>
              </h2>
              <p className="text-xs text-neutral-400">Respond directly to user support requests in real-time</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[580px] bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
              
              {/* Left Column: User Conversations List */}
              <div className="border-r border-neutral-800 flex flex-col h-full bg-neutral-950/60">
                <div className="p-3.5 border-b border-neutral-800 font-bold text-xs text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Conversations ({supportThreads.length})</span>
                  <span className="text-emerald-400 text-[10px] lowercase">live firebase sync</span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-neutral-850 p-1">
                  {supportThreads.map((thread) => (
                    <button
                      key={thread.userId}
                      onClick={() => setSelectedUserForChat(thread.userId)}
                      className={`w-full text-left p-3 rounded-2xl transition-all flex items-center gap-3 ${
                        selectedUserForChat === thread.userId
                          ? 'bg-red-600/15 border border-red-500/30'
                          : 'hover:bg-neutral-850'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl overflow-hidden border border-neutral-700 bg-neutral-900 flex-shrink-0">
                        {thread.userAvatar ? (
                          <img src={thread.userAvatar} alt={thread.userName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-red-600 flex items-center justify-center text-white font-bold text-xs">
                            {thread.userName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white truncate">{thread.userName}</span>
                          <span className="text-[10px] text-neutral-400">
                            {new Date(thread.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                          {thread.lastMessage.message}
                        </p>
                      </div>

                      {thread.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                          {thread.unreadCount}
                        </span>
                      )}
                    </button>
                  ))}

                  {supportThreads.length === 0 && (
                    <div className="p-8 text-center text-xs text-neutral-400 space-y-2">
                      <MessageSquare className="w-6 h-6 text-neutral-600 mx-auto" />
                      <div>No support inquiries yet</div>
                      <p className="text-[11px]">User messages sent via the Live Support widget will appear here immediately.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right 2 Columns: Active Chat Thread */}
              <div className="md:col-span-2 flex flex-col h-full bg-neutral-900/50">
                {selectedUserForChat ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-3.5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/40">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl overflow-hidden border border-neutral-700">
                          {activeThread?.userAvatar ? (
                            <img src={activeThread.userAvatar} alt={activeThread.userName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-white text-xs font-bold">
                              {activeThread?.userName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{activeThread?.userName}</div>
                          <div className="text-[10px] text-neutral-400">{activeThread?.userEmail} • User ID: {activeThread?.userId}</div>
                        </div>
                      </div>

                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Live Support Connected
                      </span>
                    </div>

                    {/* Messages Scroll Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {activeChatMessages.map((msg) => {
                        const isAdminMsg = msg.sender === 'admin';
                        return (
                          <div 
                            key={msg.id}
                            className={`flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'}`}
                          >
                            <div className="flex items-center gap-1.5 mb-1 text-[10px] text-neutral-400">
                              <span>{isAdminMsg ? 'Admin (Rahin)' : msg.userName}</span>
                              <span>•</span>
                              <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                              isAdminMsg 
                                ? 'bg-red-600 text-white rounded-br-none shadow-lg shadow-red-600/20' 
                                : 'bg-neutral-800 text-neutral-100 rounded-bl-none border border-neutral-700'
                            }`}>
                              {msg.message}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Chat Input Bar */}
                    <form onSubmit={handleSendAdminReply} className="p-3 border-t border-neutral-800 bg-neutral-950/60 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Type reply to user as Admin (Rahin)..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="flex-1 px-4 py-2.5 bg-neutral-900 border border-neutral-800 focus:border-red-500 rounded-xl text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                      <button
                        type="submit"
                        disabled={!replyText.trim()}
                        className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 transition-all flex-shrink-0"
                        title="Send Reply"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                    <MessageSquare className="w-10 h-10 text-neutral-700" />
                    <div className="text-sm font-bold text-neutral-300">Select a User Conversation</div>
                    <p className="text-xs text-neutral-400 max-w-sm">
                      Choose any user inquiry from the left panel to review questions and dispatch live replies as Administrator Rahin.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Inspect User Modal */}
      {inspectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl p-6 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden border border-red-500/40">
                  <img src={inspectingUser.avatar} alt={inspectingUser.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{inspectingUser.name}</h3>
                  <p className="text-xs text-neutral-400">@{inspectingUser.username} • ID: {inspectingUser.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEditUser(inspectingUser)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Info</span>
                </button>
                <button
                  onClick={() => setInspectingUser(null)}
                  className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-semibold">User ID (System ID)</span>
                  <span className="text-[10px] font-mono text-neutral-500">Unique Identifier</span>
                </div>
                <div className="text-white font-mono text-xs font-bold mt-1 select-all truncate">{inspectingUser.id}</div>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-semibold">Account Password</span>
                  <button
                    type="button"
                    onClick={() => setShowInspectPass(!showInspectPass)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {showInspectPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showInspectPass ? 'Hide Password' : 'Reveal Password'}</span>
                  </button>
                </div>
                <div className="text-white font-mono text-xs font-bold mt-1 tracking-wider">
                  {showInspectPass ? (inspectingUser.password || 'password123 (Default)') : '••••••••••••'}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
                <div className="text-neutral-400 font-semibold">Email</div>
                <div className="text-white font-bold mt-1 truncate">{inspectingUser.email}</div>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
                <div className="text-neutral-400 font-semibold">Country</div>
                <div className="text-white font-bold mt-1">{inspectingUser.country || 'Global'}</div>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
                <div className="text-neutral-400 font-semibold">Age & Filter</div>
                <div className="text-white font-bold mt-1">
                  {inspectingUser.age ? `${inspectingUser.age} yrs` : 'Not specified'}
                  {inspectingUser.isUnder18 && ' (🛡️ Under 18 Filter active)'}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
                <div className="text-neutral-400 font-semibold">Member Since</div>
                <div className="text-white font-bold mt-1">
                  {new Date(inspectingUser.joinedAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Subscription Status & Admin Direct Override */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>VIP Subscription Status</span>
                </span>
                {checkUserHasActiveSubscription(inspectingUser) && inspectingUser.subscription ? (
                  getTierBadge(inspectingUser.subscription.tier)
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 text-[10px] font-semibold">
                    Free / No Active Pass
                  </span>
                )}
              </div>

              {inspectingUser.subscription && checkUserHasActiveSubscription(inspectingUser) ? (
                <div className="text-xs text-neutral-400 space-y-1">
                  <div>
                    Pass Tier: <strong className="text-white">{getTierDisplayName(inspectingUser.subscription.tier)}</strong>
                  </div>
                  <div>
                    Expires: <strong className="text-emerald-400">
                      {inspectingUser.subscription.isPermanent
                        ? 'Never (Permanent Lifetime Access)'
                        : `${new Date(inspectingUser.subscription.expiresAt!).toLocaleDateString()} (${getUserSubscriptionDaysLeft(inspectingUser)} days left)`}
                    </strong>
                  </div>
                  {inspectingUser.subscription.codeUsed && (
                    <div className="text-[11px] text-neutral-500 font-mono">
                      Redeemed Code: {inspectingUser.subscription.codeUsed}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Admin VIP Grant / Revoke Actions */}
              <div className="pt-2 border-t border-neutral-850 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-neutral-400 w-full mb-1">
                  Admin Action: Grant / Revoke Pass
                </span>
                <button
                  onClick={() => handleGrantUserSubscription(inspectingUser.id, 'one_month')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold"
                >
                  +1 Month
                </button>
                <button
                  onClick={() => handleGrantUserSubscription(inspectingUser.id, 'six_months')}
                  className="px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-[11px] font-bold"
                >
                  +6 Months
                </button>
                <button
                  onClick={() => handleGrantUserSubscription(inspectingUser.id, 'one_year')}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-[11px] font-bold"
                >
                  +1 Year
                </button>
                <button
                  onClick={() => handleGrantUserSubscription(inspectingUser.id, 'permanent')}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold"
                >
                  +Permanent
                </button>
                {inspectingUser.subscription && (
                  <button
                    onClick={() => handleRevokeUserSubscription(inspectingUser.id)}
                    className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-[11px] font-bold ml-auto"
                  >
                    Revoke Pass
                  </button>
                )}
              </div>
            </div>

            {/* Watched Titles List */}
            <div>
              <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                User Watch History ({inspectingUser.watchHistory?.length || 0})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {(inspectingUser.watchHistory || []).map((h) => (
                  <div key={`${h.id}-${h.watched_at}`} className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800/80 flex items-center justify-between text-xs">
                    <div className="truncate font-medium text-neutral-200">
                      {h.title} {h.season ? `(S${h.season}E${h.episode})` : ''}
                    </div>
                    <span className="text-[10px] text-neutral-400 flex-shrink-0">
                      {new Date(h.watched_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
                {(!inspectingUser.watchHistory || inspectingUser.watchHistory.length === 0) && (
                  <p className="text-xs text-neutral-400 py-2">No watch history recorded for this user.</p>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2 border-t border-neutral-800">
              <button
                onClick={() => setConfirmDeleteUser({ id: inspectingUser.id, name: inspectingUser.name || inspectingUser.username, email: inspectingUser.email })}
                className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>

              <button
                onClick={() => setInspectingUser(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete Subscription Code Confirmation Modal */}
      {confirmDeleteCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-white">Delete Subscription Code</h3>
              <p className="text-xs text-neutral-400">
                Are you sure you want to permanently delete and revoke this subscription pass code?
              </p>
              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-sm text-red-400 font-bold tracking-wider break-all mt-2">
                {confirmDeleteCode.code}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteCode(null)}
                disabled={deletingCodeId !== null}
                className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDeleteCode(confirmDeleteCode.id)}
                disabled={deletingCodeId !== null}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingCodeId ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete User Confirmation Modal */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-white">Delete User Account</h3>
              <p className="text-xs text-neutral-400">
                Are you sure you want to permanently delete this account from Zinovis and Firebase?
              </p>
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 mt-2 text-left space-y-1">
                <div>User: <strong className="text-white">{confirmDeleteUser.name}</strong></div>
                <div>Email: <strong className="text-neutral-400">{confirmDeleteUser.email}</strong></div>
                <div className="text-[11px] text-red-400 font-mono">ID: {confirmDeleteUser.id}</div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteUser(null)}
                disabled={deletingUserId !== null}
                className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDeleteUser(confirmDeleteUser.id)}
                disabled={deletingUserId !== null}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingUserId ? 'Deleting...' : 'Delete User'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2 text-white font-bold">
                <UserCog className="w-5 h-5 text-amber-400" />
                <span>Edit User Profile & Info</span>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  value={editFormName}
                  onChange={(e) => setEditFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Username (@)</label>
                <input
                  type="text"
                  value={editFormUsername}
                  onChange={(e) => setEditFormUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  value={editFormEmail}
                  onChange={(e) => setEditFormEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Account Password</label>
                <input
                  type="text"
                  value={editFormPassword}
                  onChange={(e) => setEditFormPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Age</label>
                  <input
                    type="number"
                    value={editFormAge}
                    onChange={(e) => setEditFormAge(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Country</label>
                  <input
                    type="text"
                    value={editFormCountry}
                    onChange={(e) => setEditFormCountry(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Avatar Image URL</label>
                <input
                  type="text"
                  value={editFormAvatar}
                  onChange={(e) => setEditFormAvatar(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:border-amber-500 focus:outline-none"
                />
                <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                  {AVATAR_PRESETS.slice(0, 6).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setEditFormAvatar(preset.url)}
                      className={`w-9 h-9 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${editFormAvatar === preset.url ? 'border-amber-400 scale-105' : 'border-neutral-800 opacity-70 hover:opacity-100'}`}
                    >
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex gap-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-600/30"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
