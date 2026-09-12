import React, { useState, useEffect, useRef } from 'react';
import { 
  Film, 
  Tv, 
  Search, 
  Bookmark, 
  Sparkles, 
  Play, 
  X, 
  Sliders, 
  Clock, 
  ChevronRight,
  TrendingUp,
  Star,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Heart,
  Headphones,
  ShieldCheck,
  Settings
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MediaItem, MediaType } from '../types';
import { searchMulti, getImageUrl } from '../services/tmdb';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_AVATAR, getInitialAvatar } from '../utils/avatars';

interface NavbarProps {
  onOpenFilter: () => void;
}

export const SERVERS = [
  { id: 'vidsrc_cc', name: 'Server 1: VidSrc CC', badge: '1080p Ultra HD', description: 'Fastest multi-audio CDN' },
  { id: 'vidsrc_pro', name: 'Server 2: VidSrc Pro', badge: '1080p HD', description: 'High reliability server' },
  { id: 'vidsrc_xyz', name: 'Server 3: VidSrc XYZ', badge: '1080p HD', description: 'High speed buffer' },
  { id: 'autoembed', name: 'Server 4: AutoEmbed Prime', badge: '1080p HD', description: 'Multi-subtitles & streams' },
  { id: 'twoembed', name: 'Server 5: 2Embed VIP', badge: '1080p HD', description: 'Alternative HD stream' },
  { id: 'smashy', name: 'Server 6: SmashyStream', badge: '1080p HD', description: 'Global multi-server player' },
];

export const Navbar: React.FC<NavbarProps> = ({ onOpenFilter }) => {
  const { 
    currentUser, 
    isLoggedIn, 
    isUnder18,
    openAuthModal, 
    logout, 
    watchLaterCount,
    isAdmin,
    openSupportModal
  } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.substring(1) || 'home';

  // Handle scroll header background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Search debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchMulti(searchQuery);
        setSearchResults(results.slice(0, 7));
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
        setShowDropdown(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      {/* Top Fixed Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-neutral-950/95 backdrop-blur-xl border-b border-neutral-800/80 shadow-2xl shadow-black/90 py-2 sm:py-2.5' 
          : 'bg-gradient-to-b from-neutral-950/95 via-neutral-950/70 to-transparent py-2.5 sm:py-3.5'
      }`}>
        <div className="max-w-[2560px] mx-auto px-3 sm:px-6 lg:px-12 2xl:px-24 w-full">
          <div className="flex items-center justify-between gap-2 sm:gap-4 w-full">
            
            {/* Brand Logo */}
            <div className="flex items-center gap-3 sm:gap-6 lg:gap-8 flex-shrink-0">
              <Link 
                to="/"
                className="flex items-center gap-2 sm:gap-2.5 group text-left focus:outline-none flex-shrink-0"
              >
                <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 2xl:w-11 2xl:h-11 rounded-xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 p-0.5 shadow-lg shadow-red-500/20 group-hover:shadow-red-500/40 transition-all duration-300">
                  <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center">
                    <Film className="w-4 h-4 sm:w-4.5 sm:h-4.5 2xl:w-6 2xl:h-6 text-red-500 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-base sm:text-xl 2xl:text-2xl font-black tracking-wider text-white font-sans flex items-center leading-none">
                    ZINO<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-400">VIS</span>
                  </span>
                  <span className="text-[8px] sm:text-[9px] 2xl:text-xs font-bold tracking-widest text-red-400/90 uppercase mt-0.5 hidden xs:block leading-none">
                    HD STREAMING
                  </span>
                </div>
              </Link>

              {/* Navigation Links */}
              <nav className="hidden md:flex items-center gap-1">
                {[
                  { id: 'home', path: '/', label: 'Home', icon: Film },
                  { id: 'movies', path: '/movies', label: 'Movies', icon: Film },
                  { id: 'tv', path: '/tv', label: 'TV Series', icon: Tv },
                  { id: 'trending', path: '/trending', label: 'Trending', icon: TrendingUp },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id || (item.id === 'home' && activeTab === '');
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive 
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-sm' 
                          : 'text-neutral-300 hover:text-white hover:bg-neutral-800/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Search & Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
              
              {/* Search Bar with Autocomplete */}
              <div ref={searchRef} className="relative">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 2xl:w-6 2xl:h-6 text-neutral-400 absolute left-2.5 sm:left-3 2xl:left-4 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search movies, TV..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery.trim() && setShowDropdown(true)}
                    className="w-28 xs:w-36 sm:w-52 md:w-60 2xl:w-80 focus:w-40 xs:focus:w-48 sm:focus:w-64 md:focus:w-72 pl-7 sm:pl-9 2xl:pl-12 pr-6 sm:pr-8 py-1.5 2xl:py-2 bg-neutral-900/90 hover:bg-neutral-900 focus:bg-neutral-950 text-white text-xs sm:text-sm 2xl:text-base rounded-full border border-neutral-700/60 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all duration-300 placeholder:text-neutral-500"
                  />
                  {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setShowDropdown(false);
                    }}
                    className="absolute right-2 text-neutral-400 hover:text-white p-0.5"
                  >
                    <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                )}
              </div>

              {/* Search Dropdown */}
              {showDropdown && (
                <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 mt-2 sm:w-96 max-w-md bg-neutral-900/95 border border-neutral-800 rounded-2xl shadow-2xl shadow-black/90 backdrop-blur-xl overflow-hidden z-50">
                  <div className="p-2 border-b border-neutral-800 flex items-center justify-between text-xs text-neutral-400 px-3">
                    <span>Search Results</span>
                    {isSearching && <span className="text-red-400 animate-pulse">Searching...</span>}
                  </div>

                  <div className="max-h-96 overflow-y-auto divide-y divide-neutral-800/50">
                    {searchResults.length === 0 && !isSearching ? (
                      <div className="p-6 text-center text-sm text-neutral-400">
                        No movies or TV shows found for "{searchQuery}"
                      </div>
                    ) : (
                      searchResults.map((item) => {
                        const title = item.title || item.name || 'Untitled';
                        const type = item.media_type || 'movie';
                        const date = item.release_date || item.first_air_date || '';
                        const year = date ? new Date(date).getFullYear() : 'N/A';

                        return (
                          <div
                            key={`${type}-${item.id}`}
                            className="flex items-center gap-3 p-2.5 hover:bg-neutral-800/80 transition-colors group cursor-pointer"
                            onClick={() => {
                              navigate(`/detail/${type}/${item.id}`);
                              setShowDropdown(false);
                            }}
                          >
                            <img
                              src={getImageUrl(item.poster_path, 'poster')}
                              alt={title}
                              className="w-11 h-16 object-cover rounded-lg bg-neutral-800 flex-shrink-0 shadow"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-white group-hover:text-red-400 transition-colors truncate">
                                {title}
                              </h4>
                              <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
                                <span className="uppercase px-1.5 py-0.5 rounded bg-neutral-800 font-semibold text-[10px] text-neutral-300">
                                  {type === 'movie' ? 'Movie' : 'TV Series'}
                                </span>
                                <span>{year}</span>
                                {item.vote_average > 0 && (
                                  <span className="flex items-center gap-1 text-amber-400 font-medium">
                                    <Star className="w-3 h-3 fill-amber-400" />
                                    {item.vote_average.toFixed(1)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/play/${type}/${item.id}`);
                                setShowDropdown(false);
                              }}
                              className="p-2 rounded-full bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition-all flex-shrink-0"
                              title="Play Now in HD"
                            >
                              <Play className="w-4 h-4 fill-current" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Filter Toggle */}
            <button
              onClick={onOpenFilter}
              className="p-1.5 sm:p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-all flex-shrink-0"
              title="Filter Catalog"
            >
              <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Live Support Button */}
            <button
              onClick={openSupportModal}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs font-semibold text-neutral-300 hover:text-white transition-all cursor-pointer"
              title="Live Support Chat"
            >
              <Headphones className="w-3.5 h-3.5 text-rose-400" />
              <span>Support</span>
            </button>

            {/* Profile Nav Button */}
            <Link
              to="/profile"
              className={`relative hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'profile'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800'
              }`}
              title="User Profile"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Profile</span>
            </Link>

            {/* Profile & Auth Section */}
            {isLoggedIn && currentUser ? (
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-2xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-xl overflow-hidden border border-red-500/40 bg-neutral-950 flex-shrink-0">
                    <img 
                      src={currentUser.avatar || getInitialAvatar(currentUser.name || currentUser.username || 'User')} 
                      alt={currentUser.name} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="hidden md:inline text-xs font-bold text-neutral-200 max-w-[90px] truncate">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                </button>

                {/* Profile Dropdown */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl shadow-black/90 p-2 z-50 animate-fadeIn">
                    
                    {/* User Header */}
                    <div className="p-3 border-b border-neutral-800 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-red-500/40 flex-shrink-0">
                        <img 
                          src={currentUser.avatar || getInitialAvatar(currentUser.name || currentUser.username || 'User')} 
                          alt={currentUser.name} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer" 
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
                        <div className="text-[10px] text-neutral-400 truncate">
                          {currentUser.country ? `${currentUser.country} • ` : ''}
                          {currentUser.age ? `Age ${currentUser.age}` : `ID: ${currentUser.id}`}
                        </div>
                        {isUnder18 ? (
                          <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Safe Mode (Under 18 Filter)</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-red-400 font-medium">VIP Streamer</div>
                        )}
                      </div>
                    </div>

                    <div className="py-1">
                      {isAdmin && (
                        <button
                          onClick={() => {
                            navigate('/admin');
                            setShowProfileMenu(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-400 hover:text-white hover:bg-red-600/20 rounded-xl transition-colors"
                        >
                          <Heart className="w-3.5 h-3.5 fill-current" />
                          <span>Admin Control Panel</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          navigate('/profile?tab=history');
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/80 rounded-xl transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5 text-red-400" />
                        <span>Watch History</span>
                      </button>

                      <button
                        onClick={() => {
                          navigate('/profile?tab=watchlater');
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/80 rounded-xl transition-colors"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                        <span>Watch Later Queue</span>
                      </button>

                      <button
                        onClick={() => {
                          openSupportModal();
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/80 rounded-xl transition-colors"
                      >
                        <Headphones className="w-3.5 h-3.5 text-rose-400" />
                        <span>Live Support Desk</span>
                      </button>

                      <button
                        onClick={() => {
                          navigate('/profile?tab=settings');
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/80 rounded-xl transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Streaming & Settings</span>
                      </button>
                    </div>

                    <div className="border-t border-neutral-800 pt-1">
                      <button
                        onClick={() => {
                          logout();
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>

                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-2 sm:px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs font-bold text-neutral-200 hover:text-white transition-all cursor-pointer whitespace-nowrap"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuthModal('signup')}
                  className="flex items-center gap-1 px-2 sm:px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-md shadow-red-600/30 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="w-3 h-3 flex-shrink-0" />
                  <span>Sign Up</span>
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </header>

    {/* Mobile Bottom Navigation Dock */}
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 backdrop-blur-xl border-t border-neutral-800/80 px-2 py-1.5 flex items-center justify-around shadow-[0_-8px_24px_rgba(0,0,0,0.8)] pb-[calc(0.4rem+env(safe-area-inset-bottom,0px))]">
      {[
        { id: 'home', path: '/', label: 'Home', icon: Film },
        { id: 'movies', path: '/movies', label: 'Movies', icon: Film },
        { id: 'tv', path: '/tv', label: 'TV Shows', icon: Tv },
        { id: 'trending', path: '/trending', label: 'Trending', icon: TrendingUp },
        { id: 'profile', path: '/profile', label: isLoggedIn ? 'Profile' : 'Account', icon: UserIcon },
      ].map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id || (item.id === 'home' && activeTab === '');
        return (
          <Link
            key={item.id}
            to={item.path}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
              isActive ? 'text-red-500 font-bold scale-105' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-red-500' : 'text-neutral-400'}`} />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  </>
  );
};
