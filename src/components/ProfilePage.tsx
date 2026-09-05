import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Clock, 
  Bookmark, 
  Settings, 
  Trash2, 
  Play, 
  CheckCircle, 
  Star, 
  Film, 
  Tv, 
  Search, 
  SlidersHorizontal, 
  LogOut, 
  Sparkles, 
  Copy, 
  Check, 
  Edit3, 
  Plus, 
  ShieldCheck, 
  Eye, 
  EyeOff,
  Lock,
  Key,
  FileText,
  Shield,
  Monitor,
  AlertCircle,
  Cloud,
  Server,
  Info,
  CheckCircle2,
  Save,
  Crown,
  Tag,
  ExternalLink,
  Gift,
  Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MediaType, WatchHistoryItem, WatchlistItem, SubscriptionTier } from '../types';
import { 
  getWatchHistory, 
  removeFromWatchHistory, 
  clearWatchHistory, 
  getWatchlist, 
  saveWatchlist, 
  toggleWatchedStatus, 
  toggleWatchlist, 
  getPreferredServer, 
  setPreferredServer,
  checkUserHasActiveSubscription,
  getUserSubscriptionDaysLeft
} from '../utils/storage';
import { getImageUrl } from '../services/tmdb';
import { AVATAR_PRESETS } from '../utils/avatars';
import { SERVERS } from './Navbar';
import { useSearchParams } from 'react-router-dom';

interface ProfilePageProps {
  onOpenMedia: (id: number, type: MediaType) => void;
  onPlayMedia: (id: number, type: MediaType, season?: number, episode?: number) => void;
  onExploreMore: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onOpenMedia,
  onPlayMedia,
  onExploreMore,
}) => {
  const { 
    currentUser, 
    isLoggedIn, 
    isFirebaseSynced, 
    openAuthModal, 
    logout, 
    updateProfile, 
    changePassword,
    refreshUserData,
    redeemSubscriptionCode,
    isSubscriptionRequired,
    shopUrl
  } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'history' | 'watchlater' | 'settings'>(
    tabParam === 'watchlater' ? 'watchlater' : tabParam === 'settings' ? 'settings' : 'history'
  );

  // Sync tab with URL
  useEffect(() => {
    if (tabParam === 'watchlater') setActiveTab('watchlater');
    else if (tabParam === 'settings') setActiveTab('settings');
    else if (tabParam === 'history') setActiveTab('history');
  }, [tabParam]);

  const handleTabChange = (tab: 'history' | 'watchlater' | 'settings') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Watch History State
  const [historyItems, setHistoryItems] = useState<WatchHistoryItem[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');

  // Watch Later State
  const [savedItems, setSavedItems] = useState<WatchlistItem[]>([]);
  const [savedSearch, setSavedSearch] = useState('');
  const [savedTypeFilter, setSavedTypeFilter] = useState<'all' | 'movie' | 'tv' | 'watched'>('all');
  const [savedSortBy, setSavedSortBy] = useState<'recent' | 'rating' | 'title'>('recent');

  // Edit Profile State
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser?.avatar || AVATAR_PRESETS[0].url);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Password Change State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isSubmittingPass, setIsSubmittingPass] = useState(false);

  // Subscription Code Redemption State
  const [redemptionCodeInput, setRedemptionCodeInput] = useState('');
  const [isRedeemingCode, setIsRedeemingCode] = useState(false);
  const [redeemError, setRedeemError] = useState('');
  const [redeemSuccess, setRedeemSuccess] = useState('');

  // Server preference
  const [preferredServer, setLocalPreferredServer] = useState(getPreferredServer());

  // In-app clear confirmation modal
  const [clearConfirmModal, setClearConfirmModal] = useState<{ type: 'history' | 'saved'; title: string; message: string } | null>(null);

  // Load lists
  const refreshLists = () => {
    setHistoryItems(getWatchHistory());
    setSavedItems(getWatchlist());
  };

  useEffect(() => {
    refreshLists();
    if (currentUser) {
      setEditName(currentUser.name);
      setSelectedAvatar(currentUser.avatar);
    }
  }, [currentUser?.id, currentUser?.name, currentUser?.avatar]);

  // Copy Account ID
  const handleCopyId = () => {
    if (!currentUser) return;
    navigator.clipboard.writeText(currentUser.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // History Handlers
  const handleRemoveHistoryItem = (e: React.MouseEvent, id: number, type: MediaType) => {
    e.stopPropagation();
    removeFromWatchHistory(id, type);
    refreshLists();
    refreshUserData();
  };

  const handleClearHistory = () => {
    setClearConfirmModal({
      type: 'history',
      title: 'Clear Watch History',
      message: 'Are you sure you want to clear all your watch history? This cannot be undone.',
    });
  };

  const executeClearHistory = () => {
    clearWatchHistory();
    refreshLists();
    refreshUserData();
    setClearConfirmModal(null);
  };

  // Watch Later Handlers
  const handleRemoveSaved = (e: React.MouseEvent, id: number, type: MediaType) => {
    e.stopPropagation();
    const updated = savedItems.filter(w => !(w.id === id && w.media_type === type));
    saveWatchlist(updated);
    setSavedItems(updated);
    refreshUserData();
  };

  const handleToggleWatched = (e: React.MouseEvent, id: number, type: MediaType) => {
    e.stopPropagation();
    toggleWatchedStatus(id, type);
    refreshLists();
    refreshUserData();
  };

  const handleClearWatchLater = () => {
    setClearConfirmModal({
      type: 'saved',
      title: 'Clear Watch Later Queue',
      message: 'Are you sure you want to remove all items from your Watch Later queue?',
    });
  };

  const executeClearWatchLater = () => {
    saveWatchlist([]);
    setSavedItems([]);
    refreshUserData();
    setClearConfirmModal(null);
  };

  const handleSaveToWatchLater = (e: React.MouseEvent, item: WatchHistoryItem) => {
    e.stopPropagation();
    toggleWatchlist({
      id: item.id,
      media_type: item.media_type,
      title: item.title,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      vote_average: item.vote_average,
    });
    refreshLists();
    refreshUserData();
  };

  // Profile Save
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    updateProfile({
      name: editName.trim() || currentUser.name,
      avatar: selectedAvatar,
    });
    setIsEditingProfile(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Password Change Handler
  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPass.trim()) {
      setPasswordError('Please enter your current password to verify your identity.');
      return;
    }

    if (!newPass.trim()) {
      setPasswordError('Please enter a new password.');
      return;
    }

    if (newPass.length < 4) {
      setPasswordError('New password must be at least 4 characters long.');
      return;
    }

    if (newPass !== confirmNewPass) {
      setPasswordError('New passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmittingPass(true);
    const result = changePassword(currentPass, newPass);
    setIsSubmittingPass(false);

    if (result.success) {
      setPasswordSuccess('Password successfully changed! Your new credentials are active.');
      setCurrentPass('');
      setNewPass('');
      setConfirmNewPass('');
      setTimeout(() => setPasswordSuccess(''), 5000);
    } else {
      setPasswordError(result.error || 'Failed to change password. Please check your current password.');
    }
  };

  // Subscription Code Redemption Handler
  const handleRedeemSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setRedeemError('');
    setRedeemSuccess('');

    if (!isLoggedIn) {
      openAuthModal('login');
      return;
    }

    if (!redemptionCodeInput.trim()) {
      setRedeemError('Please enter a valid subscription code to redeem.');
      return;
    }

    setIsRedeemingCode(true);
    try {
      const result = await redeemSubscriptionCode(redemptionCodeInput.trim());
      if (result.success) {
        setRedeemSuccess(result.message);
        setRedemptionCodeInput('');
      } else {
        setRedeemError(result.message);
      }
    } catch (err: any) {
      setRedeemError(err?.message || 'Failed to redeem subscription code. Please try again.');
    } finally {
      setIsRedeemingCode(false);
    }
  };

  const getTierDisplayName = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'one_month': return '1 Month Pass';
      case 'permanent': return 'Permanent Lifetime VIP';
      case 'six_months': return '6 Months Pass';
      case 'one_year': return '1 Year Pass';
      default: return tier;
    }
  };

  // Server selection
  const handleServerSelect = (serverId: string) => {
    setPreferredServer(serverId);
    setLocalPreferredServer(serverId);
  };

  // Filter history
  const filteredHistory = historyItems
    .filter(item => {
      if (historyTypeFilter !== 'all' && item.media_type !== historyTypeFilter) return false;
      if (historySearch.trim() && !item.title.toLowerCase().includes(historySearch.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => b.watched_at - a.watched_at);

  // Filter saved
  let filteredSaved = savedItems.filter(item => {
    if (savedTypeFilter === 'movie' && item.media_type !== 'movie') return false;
    if (savedTypeFilter === 'tv' && item.media_type !== 'tv') return false;
    if (savedTypeFilter === 'watched' && !item.watched) return false;
    if (savedSearch.trim() && !item.title.toLowerCase().includes(savedSearch.toLowerCase())) return false;
    return true;
  });

  filteredSaved = [...filteredSaved].sort((a, b) => {
    if (savedSortBy === 'rating') return (b.vote_average || 0) - (a.vote_average || 0);
    if (savedSortBy === 'title') return a.title.localeCompare(b.title);
    return b.added_at - a.added_at;
  });

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-12 2xl:px-24 max-w-[2560px] mx-auto min-h-screen">
      
      {/* PROFILE HEADER HERO */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-neutral-900 via-neutral-900/90 to-neutral-950 border border-neutral-800 p-6 sm:p-10 mb-8 shadow-2xl">
        
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          
          {/* User Avatar & Info */}
          <div className="flex items-center gap-5 sm:gap-7">
            <div className="relative group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden border-2 border-red-500/50 shadow-xl shadow-red-500/20 bg-neutral-950">
                <img 
                  src={currentUser?.avatar || AVATAR_PRESETS[0].url} 
                  alt={currentUser?.name || 'User'} 
                  className="w-full h-full object-cover"
                />
              </div>
              {isLoggedIn && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white hover:bg-red-600 transition-all shadow"
                  title="Change Avatar or Name"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {isLoggedIn ? currentUser?.name : 'Guest Explorer'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {isLoggedIn ? 'VIP HD Streamer' : 'Guest Mode'}
                </span>
                {isLoggedIn && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                    <Cloud className="w-3 h-3" />
                    Firebase Cloud Synced
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                {isLoggedIn ? (
                  <>
                    <div className="flex items-center gap-1 font-mono text-neutral-300">
                      <span>ID:</span>
                      <button
                        onClick={handleCopyId}
                        className="flex items-center gap-1 hover:text-red-400 font-bold bg-neutral-800/80 px-2 py-0.5 rounded-md border border-neutral-700/60"
                        title="Copy Account ID"
                      >
                        <span>{currentUser?.id}</span>
                        {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <span>•</span>
                    <span>@{currentUser?.username}</span>
                    <span>•</span>
                    <span>{currentUser?.email}</span>
                  </>
                ) : (
                  <span>Log in or create an ID to sync history across all your devices</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions & Stats */}
          <div className="flex flex-wrap items-center gap-3 self-stretch md:self-auto justify-end">
            {isLoggedIn ? (
              <>
                <button
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700 text-xs font-bold text-neutral-200 transition-all"
                >
                  <Settings className="w-4 h-4 text-neutral-400" />
                  <span>Edit Profile</span>
                </button>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-neutral-950 hover:bg-red-950/40 border border-neutral-800 hover:border-red-500/40 text-xs font-bold text-red-400 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-5 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white border border-neutral-700 transition-all"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuthModal('signup')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/30 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-8 pt-6 border-t border-neutral-800/80">
          <div 
            onClick={() => handleTabChange('history')}
            className="p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 hover:border-neutral-700 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-red-400" />
                Watched Titles
              </span>
              <span className="text-xs text-neutral-500 group-hover:text-red-400">View →</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {historyItems.length}
            </div>
          </div>

          <div 
            onClick={() => handleTabChange('watchlater')}
            className="p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 hover:border-neutral-700 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 flex items-center gap-1.5 font-medium">
                <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                Watch Later Queue
              </span>
              <span className="text-xs text-neutral-500 group-hover:text-amber-400">View →</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {savedItems.length}
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 flex flex-col justify-between">
            <span className="text-xs text-neutral-400 flex items-center gap-1.5 font-medium">
              <Monitor className="w-3.5 h-3.5 text-emerald-400" />
              Active HD Server
            </span>
            <div className="text-xs sm:text-sm font-bold text-emerald-400 truncate mt-1">
              {SERVERS.find(s => s.id === preferredServer)?.name.split(':')[1] || 'VidSrc Ultra'}
            </div>
          </div>
        </div>

      </div>

      {/* EDIT PROFILE MODAL / DRAWER IF OPEN */}
      {isEditingProfile && isLoggedIn && (
        <div className="mb-8 p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl animate-fadeIn">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-red-500" />
              <span>Customize Profile</span>
            </h3>
            <button
              onClick={() => setIsEditingProfile(false)}
              className="text-xs text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-2">
                Choose Avatar
              </label>
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedAvatar(preset.url)}
                    className={`relative w-14 h-14 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                      selectedAvatar === preset.url
                        ? 'border-red-500 scale-105 shadow-lg shadow-red-500/30'
                        : 'border-neutral-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                    {selectedAvatar === preset.url && (
                      <div className="absolute inset-0 bg-red-600/30 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white stroke-[3]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-w-md">
              <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-2xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                required
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {saveSuccess && (
        <div className="mb-6 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Profile updated successfully!</span>
        </div>
      )}

      {/* MAIN TAB CONTROLS */}
      <div className="flex items-center justify-between gap-4 mb-8 border-b border-neutral-800 pb-4">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTabChange('history')}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Watch History</span>
            <span className="px-1.5 py-0.2 rounded-full bg-neutral-950/60 text-[10px]">
              {historyItems.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('watchlater')}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'watchlater'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Watch Later / Saved</span>
            <span className="px-1.5 py-0.2 rounded-full bg-neutral-950/60 text-[10px]">
              {savedItems.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('settings')}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'settings'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>

        {/* Clear Actions */}
        {activeTab === 'history' && historyItems.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-neutral-900"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear History</span>
          </button>
        )}

        {activeTab === 'watchlater' && savedItems.length > 0 && (
          <button
            onClick={handleClearWatchLater}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-neutral-900"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear All Saved</span>
          </button>
        )}

      </div>

      {/* ========================================================================= */}
      {/* TAB 1: WATCH HISTORY */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          
          {/* History Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            
            {/* Search input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search watched movies or series..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 placeholder:text-neutral-500"
              />
            </div>

            {/* Type Filter Chips */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {[
                { id: 'all', label: 'All History' },
                { id: 'movie', label: 'Movies' },
                { id: 'tv', label: 'TV Shows' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setHistoryTypeFilter(f.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    historyTypeFilter === f.id
                      ? 'bg-neutral-200 text-neutral-900'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

          </div>

          {/* History Items Grid */}
          {filteredHistory.length === 0 ? (
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-3xl p-12 text-center max-w-lg mx-auto my-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-neutral-800/80 border border-neutral-700 flex items-center justify-center text-neutral-500 mx-auto">
                <Clock className="w-8 h-8 text-neutral-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">No Watch History Yet</h3>
                <p className="text-xs text-neutral-400">
                  Whenever you stream a movie or TV show, it will automatically show up here so you can pick up right where you left off.
                </p>
              </div>
              <button
                onClick={onExploreMore}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-600 text-white text-xs font-bold shadow-lg shadow-red-600/30 hover:bg-red-500 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Watching Now</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredHistory.map((item) => {
                const isSaved = savedItems.some(s => s.id === item.id && s.media_type === item.media_type);

                return (
                  <div
                    key={`hist-${item.media_type}-${item.id}-${item.watched_at}`}
                    onClick={() => onOpenMedia(item.id, item.media_type)}
                    className="group relative flex items-center gap-4 p-3.5 rounded-2xl bg-neutral-900/70 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer select-none"
                  >
                    {/* Poster */}
                    <div className="relative w-20 sm:w-24 aspect-[2/3] rounded-xl overflow-hidden bg-neutral-950 flex-shrink-0 border border-neutral-800 shadow">
                      <img
                        src={getImageUrl(item.poster_path, 'poster')}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-neutral-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-6 h-6 text-white fill-current" />
                      </div>
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] font-bold text-neutral-300 uppercase">
                          {item.media_type === 'movie' ? 'Movie' : 'TV Series'}
                        </span>
                        <span className="text-[11px] text-red-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(item.watched_at)}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors truncate">
                        {item.title}
                      </h4>

                      {item.media_type === 'tv' && (item.season || item.episode) && (
                        <p className="text-xs text-neutral-400 mt-0.5 truncate">
                          Season {item.season || 1} • Episode {item.episode || 1}
                          {item.episode_title && ` - "${item.episode_title}"`}
                        </p>
                      )}

                      {/* Progress bar */}
                      <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
                        <div 
                          className="bg-red-600 h-full rounded-full"
                          style={{ width: `${item.progress_percent || 70}%` }}
                        />
                      </div>

                      {/* Quick Action buttons */}
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayMedia(item.id, item.media_type, item.season, item.episode);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/30 transition-all"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Resume</span>
                        </button>

                        <button
                          onClick={(e) => handleSaveToWatchLater(e, item)}
                          className={`p-1.5 rounded-xl border text-xs transition-all ${
                            isSaved
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                              : 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:text-white'
                          }`}
                          title={isSaved ? 'In Watch Later' : 'Save to Watch Later'}
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => handleRemoveHistoryItem(e, item.id, item.media_type)}
                          className="p-1.5 rounded-xl bg-neutral-800/80 border border-neutral-700 text-neutral-400 hover:text-red-400 transition-all ml-auto"
                          title="Remove from history"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: WATCH LATER / SAVED MOVIES */}
      {/* ========================================================================= */}
      {activeTab === 'watchlater' && (
        <div className="space-y-6">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search saved movies or shows..."
                value={savedSearch}
                onChange={(e) => setSavedSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 placeholder:text-neutral-500"
              />
            </div>

            {/* Filter and Sort */}
            <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
              {[
                { id: 'all', label: `All (${savedItems.length})` },
                { id: 'movie', label: `Movies (${savedItems.filter(i => i.media_type === 'movie').length})` },
                { id: 'tv', label: `TV (${savedItems.filter(i => i.media_type === 'tv').length})` },
                { id: 'watched', label: `Watched (${savedItems.filter(i => i.watched).length})` },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSavedTypeFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    savedTypeFilter === f.id
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}

              <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5">
                <SlidersHorizontal className="w-3 h-3 text-neutral-400" />
                <select
                  value={savedSortBy}
                  onChange={(e) => setSavedSortBy(e.target.value as any)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value="recent" className="bg-neutral-900">Recently Saved</option>
                  <option value="rating" className="bg-neutral-900">Highest Rating</option>
                  <option value="title" className="bg-neutral-900">Title (A-Z)</option>
                </select>
              </div>
            </div>

          </div>

          {/* Grid of Saved Titles */}
          {filteredSaved.length === 0 ? (
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-3xl p-12 text-center max-w-lg mx-auto my-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-neutral-800/80 border border-neutral-700 flex items-center justify-center text-neutral-500 mx-auto">
                <Bookmark className="w-8 h-8 text-amber-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">No Saved Movies in Watch Later</h3>
                <p className="text-xs text-neutral-400">
                  Save any movie or TV series by clicking the "Watch Later" bookmark button on posters or detail cards.
                </p>
              </div>
              <button
                onClick={onExploreMore}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-600 text-white text-xs font-bold shadow-lg shadow-red-600/30 hover:bg-red-500 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Explore Catalog & Save Movies</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-7 gap-4 sm:gap-6 2xl:gap-8">
              {filteredSaved.map((item) => {
                const year = item.release_date ? new Date(item.release_date).getFullYear() : '';

                return (
                  <div
                    key={`saved-${item.media_type}-${item.id}`}
                    onClick={() => onOpenMedia(item.id, item.media_type)}
                    className="group relative flex-shrink-0 cursor-pointer select-none"
                  >
                    <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-lg group-hover:border-neutral-700 transition-all duration-300">
                      <img
                        src={getImageUrl(item.poster_path, 'poster')}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
                        <span className="px-1.5 py-0.5 rounded bg-neutral-950/90 text-[10px] font-bold text-neutral-300 uppercase">
                          {item.media_type === 'movie' ? 'Movie' : 'TV'}
                        </span>
                        <button
                          onClick={(e) => handleToggleWatched(e, item.id, item.media_type)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            item.watched
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                          title={item.watched ? 'Mark as Unwatched' : 'Mark as Watched'}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Overlay */}
                      <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-between z-20">
                        <button
                          onClick={(e) => handleRemoveSaved(e, item.id, item.media_type)}
                          className="self-end p-2 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-red-400 transition-all"
                          title="Remove from Watch Later"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="flex justify-center my-auto">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlayMedia(item.id, item.media_type);
                            }}
                            className="p-3.5 rounded-full bg-red-600 text-white shadow-xl shadow-red-600/50 hover:scale-110 transition-transform"
                            title="Stream in HD"
                          >
                            <Play className="w-6 h-6 fill-current translate-x-0.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
                          <span className="text-amber-400 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            {item.vote_average?.toFixed(1) || '8.0'}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {formatRelativeTime(item.added_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5">
                      <h3 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-red-400 transition-colors">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                        <span className="capitalize">{item.media_type}</span>
                        {year && <span>• {year}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SETTINGS (Profile, Password Change, Privacy & Policy, Default HD Server) */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="max-w-3xl space-y-8 animate-fadeIn">
          
          {/* --------------------------------------------------------------------- */}
          {/* SECTION 1: PROFILE */}
          {/* --------------------------------------------------------------------- */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">1. Profile</h3>
                  <p className="text-xs text-neutral-400">
                    Customize your public streamer profile, avatar identity, and display name.
                  </p>
                </div>
              </div>
              {isLoggedIn && (
                <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  <Cloud className="w-3.5 h-3.5" />
                  Cloud Synced
                </span>
              )}
            </div>

            {isLoggedIn ? (
              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* Avatar Picker */}
                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-3">
                    Choose Your Avatar
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                    {AVATAR_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedAvatar(preset.url)}
                        className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all group ${
                          selectedAvatar === preset.url
                            ? 'border-red-500 scale-105 shadow-lg shadow-red-500/30'
                            : 'border-neutral-800 opacity-60 hover:opacity-100 hover:border-neutral-700'
                        }`}
                        title={preset.name}
                      >
                        <img 
                          src={preset.url} 
                          alt={preset.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
                        />
                        {selectedAvatar === preset.url && (
                          <div className="absolute inset-0 bg-red-600/30 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white stroke-[3]" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Profile Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Your display name"
                      className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-2xl text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-2">
                      Username (Handle)
                    </label>
                    <input
                      type="text"
                      value={`@${currentUser?.username || 'streamer'}`}
                      disabled
                      className="w-full px-4 py-3 bg-neutral-950/60 border border-neutral-800/80 rounded-2xl text-sm text-neutral-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Account Details Badges */}
                <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-300">Account ID:</span>
                    <span className="font-mono text-neutral-200 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                      {currentUser?.id}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="p-1 hover:text-white transition-colors"
                      title="Copy ID"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-300">Email:</span>
                    <span className="text-neutral-300">{currentUser?.email}</span>
                  </div>
                </div>

                {saveSuccess && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Profile updated and saved successfully!</span>
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Profile Changes</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-center space-y-3">
                <p className="text-xs sm:text-sm text-neutral-300">
                  You are currently using Zinovis in Guest Mode. Sign in or create a free account to customize your avatar, set a display name, and sync your watchlists to the cloud.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => openAuthModal('login')}
                    className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition-all"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => openAuthModal('signup')}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/30 transition-all"
                  >
                    Create Account
                  </button>
                </div>
              </div>
            )}
          </div>


          {/* --------------------------------------------------------------------- */}
          {/* SECTION 2: PASSWORD CHANGE (Enter current pass first, then change pass) */}
          {/* --------------------------------------------------------------------- */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-neutral-800">
              <div className="p-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">2. Password Change</h3>
                <p className="text-xs text-neutral-400">
                  To change your password, enter your current password first for security verification.
                </p>
              </div>
            </div>

            {isLoggedIn ? (
              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-xl">
                
                {/* Current Password Field */}
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-2">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      placeholder="Enter your existing current password"
                      className="w-full pl-4 pr-11 py-3 bg-neutral-950 border border-neutral-800 rounded-2xl text-sm text-white focus:outline-none focus:border-red-500 transition-colors placeholder:text-neutral-600"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-neutral-500 hover:text-neutral-300"
                      title={showCurrentPass ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    You must enter your current password to authorize password modification.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-2">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        placeholder="Min. 4 characters"
                        className="w-full pl-4 pr-11 py-3 bg-neutral-950 border border-neutral-800 rounded-2xl text-sm text-white focus:outline-none focus:border-red-500 transition-colors placeholder:text-neutral-600"
                        required
                        minLength={4}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-neutral-500 hover:text-neutral-300"
                      >
                        {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-2">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPass ? 'text' : 'password'}
                        value={confirmNewPass}
                        onChange={(e) => setConfirmNewPass(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full pl-4 pr-11 py-3 bg-neutral-950 border border-neutral-800 rounded-2xl text-sm text-white focus:outline-none focus:border-red-500 transition-colors placeholder:text-neutral-600"
                        required
                        minLength={4}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-neutral-500 hover:text-neutral-300"
                      >
                        {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Error Banner */}
                {passwordError && (
                  <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {/* Success Banner */}
                {passwordSuccess && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingPass}
                    className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Key className="w-4 h-4" />
                    <span>{isSubmittingPass ? 'Updating...' : 'Update Password'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-center space-y-2">
                <p className="text-xs text-neutral-400">
                  Password management is available for registered users. Please sign in to modify your credentials.
                </p>
                <button
                  onClick={() => openAuthModal('login')}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition-all"
                >
                  Sign In to Manage Password
                </button>
              </div>
            )}
          </div>


          {/* --------------------------------------------------------------------- */}
          {/* SECTION 3: PRIVACY AND POLICY */}
          {/* --------------------------------------------------------------------- */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-neutral-800">
              <div className="p-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">3. Privacy and Policy</h3>
                <p className="text-xs text-neutral-400">
                  Our commitment to privacy, data transparency, and secure streaming.
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              
              <div className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white">
                  <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Zero-Telemetry & No-Log Streaming</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed pl-6">
                  Zinovis does not log, track, or sell your streaming history, search queries, or viewing time to advertising platforms or data brokers. Your viewing preferences remain strictly private.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white">
                  <Cloud className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  <span>Secure Cloud-Isolated Sync</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed pl-6">
                  User accounts and watchlists are securely isolated using encrypted Google Cloud Firestore database rules, ensuring your customized watchlists are accessible only by your authenticated session.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white">
                  <Monitor className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>Sandboxed HD Video Delivery</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed pl-6">
                  Embedded video stream frames are sandboxed with strict origin policies to prevent unauthorized redirects, unwanted popups, and intrusive third-party scripts.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white">
                  <Trash2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Full User Data Control & Erasure</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed pl-6">
                  You maintain 100% control over your data. You can clear your watch history, wipe your saved queue, or reset your local device storage at any time with a single click.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white">
                  <FileText className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                  <span>Terms of Service & Content Disclaimer</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed pl-6">
                  Zinovis operates as an educational discovery portal and media indexer utilizing the TMDB metadata API and third-party media players. We do not host, store, or upload media files on our infrastructure.
                </p>
              </div>

            </div>
          </div>


          {/* --------------------------------------------------------------------- */}
          {/* SECTION 4: DEFAULT HD STREAMING SERVER */}
          {/* --------------------------------------------------------------------- */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">4. Default HD Streaming Server</h3>
                  <p className="text-xs text-neutral-400">
                    Select which streaming server Zinovis connects to by default when launching video players.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">
                Active: {SERVERS.find(s => s.id === preferredServer)?.name.split(':')[0] || 'VidSrc CC'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SERVERS.map((s) => {
                const isSelected = preferredServer === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => handleServerSelect(s.id)}
                    className={`flex items-start justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-red-500/10 border-red-500/50 text-white shadow-lg shadow-red-500/10'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900/60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-red-500 animate-pulse' : 'bg-neutral-700'}`} />
                        <span className="text-sm font-bold text-white">{s.name}</span>
                      </div>
                      <p className="text-xs text-neutral-400">{s.description}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-3">
                      <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-red-400 font-bold text-[11px] border border-neutral-700">
                        {s.badge}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Default
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800/60 flex items-center gap-3 text-xs text-neutral-400">
              <Info className="w-4 h-4 text-neutral-500 flex-shrink-0" />
              <span>
                Tip: You can also switch streaming servers in real-time inside the media player header if any video stream is buffering.
              </span>
            </div>
          </div>


          {/* --------------------------------------------------------------------- */}
          {/* SECTION 5: VIP SUBSCRIPTION & CODE REDEMPTION */}
          {/* --------------------------------------------------------------------- */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Crown className="w-5 h-5 fill-amber-400/20" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">VIP Subscription &amp; Code Redemption</h3>
                  <p className="text-xs text-neutral-400">
                    Manage your VIP streaming pass, buy codes from our official shop, or redeem activation passes.
                  </p>
                </div>
              </div>

              {currentUser && checkUserHasActiveSubscription(currentUser) && (
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-black text-xs border border-amber-500/30 flex items-center gap-1.5 shadow-sm shadow-amber-500/10">
                  <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  VIP ACTIVE
                </span>
              )}
            </div>

            {/* Current Subscription Status Card */}
            <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Your Current Membership Status
                </span>
                <span className={`text-xs font-bold ${
                  currentUser && checkUserHasActiveSubscription(currentUser)
                    ? 'text-amber-400'
                    : isSubscriptionRequired
                    ? 'text-red-400'
                    : 'text-emerald-400'
                }`}>
                  {currentUser && checkUserHasActiveSubscription(currentUser)
                    ? '👑 VIP Member'
                    : isSubscriptionRequired
                    ? '🔒 Subscription Required'
                    : '✨ Standard Free Streamer'}
                </span>
              </div>

              {currentUser && checkUserHasActiveSubscription(currentUser) && currentUser.subscription ? (
                <div className="space-y-2 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <div>
                      <div className="text-sm font-black text-white flex items-center gap-1.5">
                        <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span>{getTierDisplayName(currentUser.subscription.tier)}</span>
                      </div>
                      <div className="text-xs text-amber-200/80 mt-0.5">
                        {currentUser.subscription.isPermanent
                          ? 'Permanent Lifetime VIP Access — Never expires!'
                          : `Expires on ${new Date(currentUser.subscription.expiresAt!).toLocaleDateString()} (${getUserSubscriptionDaysLeft(currentUser)} days left)`}
                      </div>
                    </div>

                    <div className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/40">
                      {currentUser.subscription.isPermanent ? 'LIFETIME' : `${getUserSubscriptionDaysLeft(currentUser)} DAYS REMAINING`}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {isSubscriptionRequired
                    ? 'Zinovis is currently operating in VIP Subscription mode. You need an active subscription pass code to play HD streams.'
                    : 'Zinovis is currently running in Free Streaming mode. You can watch any movie or show for free, or redeem a VIP code for future priority access.'}
                </p>
              )}
            </div>

            {/* Official Store Purchase Link Box */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-red-950/40 via-neutral-950 to-neutral-950 border border-red-500/30 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-red-500" />
                    <h4 className="text-sm font-bold text-white">Buy Subscription Code Online</h4>
                  </div>
                  <p className="text-xs text-neutral-300">
                    You can buy subscription code from this website:
                  </p>
                  <div className="font-mono text-xs text-red-400 font-bold break-all">
                    {shopUrl}
                  </div>
                </div>

                <a
                  href={shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all flex-shrink-0"
                >
                  <Gift className="w-4 h-4" />
                  <span>Buy Subscription Code</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                </a>
              </div>
            </div>

            {/* Subscription Code Enter Space */}
            <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Redeem Subscription Code
                </label>
                <p className="text-xs text-neutral-400">
                  Enter your purchased subscription pass code below to activate or extend your VIP access:
                </p>
              </div>

              <form onSubmit={handleRedeemSubscription} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Enter subscription code (e.g. ZNV-1M-XXXX-XXXX)"
                    value={redemptionCodeInput}
                    onChange={(e) => setRedemptionCodeInput(e.target.value)}
                    className="flex-1 px-4 py-3 bg-neutral-900 border border-neutral-800 focus:border-red-500 rounded-2xl text-xs sm:text-sm text-white font-mono uppercase placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <button
                    type="submit"
                    disabled={isRedeemingCode || !redemptionCodeInput.trim()}
                    className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 flex-shrink-0"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>{isRedeemingCode ? 'Activating...' : 'Redeem Code'}</span>
                  </button>
                </div>

                {/* Redeem Error Banner */}
                {redeemError && (
                  <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{redeemError}</span>
                  </div>
                )}

                {/* Redeem Success Banner */}
                {redeemSuccess && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{redeemSuccess}</span>
                  </div>
                )}
              </form>
            </div>
          </div>

        </div>
      )}

      {/* In-App Clear Confirmation Modal */}
      {clearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-white">{clearConfirmModal.title}</h3>
              <p className="text-xs text-neutral-400">
                {clearConfirmModal.message}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setClearConfirmModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (clearConfirmModal.type === 'history') {
                    executeClearHistory();
                  } else {
                    executeClearWatchLater();
                  }
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Clear</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
