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
  Monitor, 
  Clock, 
  ChevronRight,
  TrendingUp,
  Star
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MediaItem, MediaType } from '../types';
import { searchMulti, getImageUrl } from '../services/tmdb';
import { getWatchlist, getPreferredServer, setPreferredServer } from '../utils/storage';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [selectedServer, setSelectedServer] = useState(getPreferredServer());
  const [showServerMenu, setShowServerMenu] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.substring(1) || 'home';

  // Update watchlist count periodically or on interaction
  useEffect(() => {
    const updateCount = () => {
      setWatchlistCount(getWatchlist().length);
    };
    updateCount();
    const interval = setInterval(updateCount, 2000);
    return () => clearInterval(interval);
  }, []);

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

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectServer = (serverId: string) => {
    setSelectedServer(serverId);
    setPreferredServer(serverId);
    setShowServerMenu(false);
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80 shadow-2xl shadow-black/80 py-3' 
        : 'bg-gradient-to-b from-neutral-950/90 via-neutral-950/50 to-transparent py-4'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Link 
              to="/"
              className="flex items-center gap-2.5 group text-left focus:outline-none"
            >
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 p-0.5 shadow-lg shadow-red-500/20 group-hover:shadow-red-500/40 transition-all duration-300">
                <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center">
                  <Film className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-black tracking-wider text-white font-sans flex items-center">
                  CINE<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-400">SCOPE</span>
                </span>
                <span className="text-[10px] font-semibold tracking-widest text-red-400/90 uppercase -mt-1 hidden sm:block">
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
          <div className="flex items-center gap-3">
            
            {/* Search Bar with Autocomplete */}
            <div ref={searchRef} className="relative">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search movies, TV shows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim() && setShowDropdown(true)}
                  className="w-36 sm:w-64 pl-9 pr-8 py-1.5 bg-neutral-900/90 hover:bg-neutral-900 focus:bg-neutral-950 text-white text-sm rounded-full border border-neutral-700/60 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all placeholder:text-neutral-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setShowDropdown(false);
                    }}
                    className="absolute right-2.5 text-neutral-400 hover:text-white p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Search Dropdown */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-neutral-900/95 border border-neutral-800 rounded-2xl shadow-2xl shadow-black/90 backdrop-blur-xl overflow-hidden z-50">
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
              className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-all"
              title="Filter Catalog"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Server Preference Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowServerMenu(!showServerMenu)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-medium text-neutral-300 hover:text-white hover:border-neutral-700 transition-all"
                title="Change Default Streaming Server"
              >
                <Monitor className="w-3.5 h-3.5 text-red-400" />
                <span className="truncate max-w-[80px]">
                  {SERVERS.find(s => s.id === selectedServer)?.name.split(':')[0] || 'Server 1'}
                </span>
                <span className="px-1 py-0.2 rounded bg-red-500/20 text-red-400 text-[9px] font-bold">
                  HD
                </span>
              </button>

              {/* Server Menu Dropdown */}
              {showServerMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-2 z-50">
                  <div className="px-3 py-2 text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                    HD Streaming Servers
                  </div>
                  <div className="mt-1 space-y-1">
                    {SERVERS.map((server) => (
                      <button
                        key={server.id}
                        onClick={() => handleSelectServer(server.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                          selectedServer === server.id
                            ? 'bg-red-500/10 border border-red-500/30 text-white'
                            : 'text-neutral-300 hover:bg-neutral-800/80'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-semibold">{server.name}</div>
                          <div className="text-[10px] text-neutral-400">{server.description}</div>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 font-bold text-red-400 border border-neutral-700">
                          {server.badge}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Watchlist Nav Button */}
            <Link
              to="/watchlist"
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'watchlist'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Watchlist</span>
              {watchlistCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {watchlistCount}
                </span>
              )}
            </Link>

          </div>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-neutral-800/60 mt-2 pt-2 px-4 bg-neutral-950/95">
        {[
          { id: 'home', path: '/', label: 'Home', icon: Film },
          { id: 'movies', path: '/movies', label: 'Movies', icon: Film },
          { id: 'tv', path: '/tv', label: 'TV Shows', icon: Tv },
          { id: 'trending', path: '/trending', label: 'Trending', icon: TrendingUp },
          { id: 'watchlist', path: '/watchlist', label: 'Watchlist', icon: Bookmark },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || (item.id === 'home' && activeTab === '');
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`flex flex-col items-center gap-1 py-1 px-2 text-[11px] font-medium transition-colors ${
                isActive ? 'text-red-500 font-bold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
};
