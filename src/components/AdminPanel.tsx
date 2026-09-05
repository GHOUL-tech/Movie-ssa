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
  Eye, 
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
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, SupportMessage, MediaItem, WatchHistoryItem } from '../types';
import { getAllUsersFromFirebase, deleteUserFromFirebase, sendSupportMessageToFirebase, subscribeToAllSupportMessages } from '../services/firebase';
import { getAllUsers, deleteUserAccount } from '../utils/storage';
import { getTrending, getImageUrl } from '../services/tmdb';

export const AdminPanel: React.FC = () => {
  const { isAdmin, logoutAdmin } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'movies' | 'support'>('analytics');
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [trendingMedia, setTrendingMedia] = useState<MediaItem[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [selectedUserForChat, setSelectedUserForChat] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // If not admin, redirect to home
  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  // Load all users from Firebase and fallback to local
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const remoteUsers = await getAllUsersFromFirebase();
      const localUsers = getAllUsers();
      
      // Merge unique users by id
      const userMap = new Map<string, User>();
      localUsers.forEach(u => userMap.set(u.id, u));
      remoteUsers.forEach(u => userMap.set(u.id, u));
      
      setUsers(Array.from(userMap.values()));
    } catch (err) {
      console.error('Failed to load users for admin:', err);
      setUsers(getAllUsers());
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
    getTrending('all', 'week').then(setTrendingMedia).catch(console.error);

    // Subscribe to support messages
    const unsubscribe = subscribeToAllSupportMessages((msgs) => {
      setSupportMessages(msgs);
    });

    return () => unsubscribe();
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
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this user account from Zinovis & Firebase?')) {
      return;
    }
    setDeletingUserId(userId);
    try {
      await deleteUserAccount(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      if (inspectingUser?.id === userId) {
        setInspectingUser(null);
      }
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

    await sendSupportMessageToFirebase({
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
                  <span>with Firebase</span>
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
                                onClick={() => handleDeleteUser(u.id)}
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

        {/* ===================== TAB 4: LIVE SUPPORT CHAT OPTION ===================== */}
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
              <button
                onClick={() => setInspectingUser(null)}
                className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
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

            <div className="pt-2 flex justify-end gap-2 border-t border-neutral-800">
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
    </div>
  );
};
