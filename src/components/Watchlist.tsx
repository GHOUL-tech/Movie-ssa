import React, { useState, useEffect } from 'react';
import { 
  Bookmark, 
  Trash2, 
  Play, 
  CheckCircle, 
  Film, 
  Tv, 
  Star, 
  SlidersHorizontal,
  Plus
} from 'lucide-react';
import { WatchlistItem, MediaType } from '../types';
import { getWatchlist, saveWatchlist, toggleWatchedStatus } from '../utils/storage';
import { getImageUrl } from '../services/tmdb';

interface WatchlistProps {
  onOpenMedia: (id: number, type: MediaType) => void;
  onPlayMedia: (id: number, type: MediaType) => void;
  onExploreMore: () => void;
}

export const Watchlist: React.FC<WatchlistProps> = ({
  onOpenMedia,
  onPlayMedia,
  onExploreMore,
}) => {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'tv' | 'watched'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'title'>('recent');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const loadItems = () => {
    setItems(getWatchlist());
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleRemove = (e: React.MouseEvent, id: number, mediaType: MediaType) => {
    e.stopPropagation();
    const updated = items.filter(w => !(w.id === id && w.media_type === mediaType));
    saveWatchlist(updated);
    setItems(updated);
  };

  const handleToggleWatched = (e: React.MouseEvent, id: number, mediaType: MediaType) => {
    e.stopPropagation();
    toggleWatchedStatus(id, mediaType);
    loadItems();
  };

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const executeClearAll = () => {
    saveWatchlist([]);
    setItems([]);
    setShowClearConfirm(false);
  };

  // Filter logic
  let filtered = items.filter(item => {
    if (filterType === 'movie') return item.media_type === 'movie';
    if (filterType === 'tv') return item.media_type === 'tv';
    if (filterType === 'watched') return item.watched;
    return true;
  });

  // Sort logic
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'rating') return (b.vote_average || 0) - (a.vote_average || 0);
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    return b.added_at - a.added_at; // Recent first
  });

  return (
    <div className="pt-20 sm:pt-24 pb-24 px-4 sm:px-6 lg:px-12 2xl:px-24 max-w-[2560px] mx-auto min-h-screen">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-red-600/20 border border-red-500/30 text-red-500">
              <Bookmark className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              My Watchlist
            </h1>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            {items.length} saved movies & TV shows for HD viewing
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-neutral-900"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Watchlist</span>
          </button>
        )}
      </div>

      {/* Filter Tabs & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        
        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {[
            { id: 'all', label: `All (${items.length})` },
            { id: 'movie', label: `Movies (${items.filter(i => i.media_type === 'movie').length})` },
            { id: 'tv', label: `TV Series (${items.filter(i => i.media_type === 'tv').length})` },
            { id: 'watched', label: `Watched (${items.filter(i => i.watched).length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterType === tab.id
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 self-end sm:self-auto">
          <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-xs text-neutral-400">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
          >
            <option value="recent" className="bg-neutral-900">Recently Added</option>
            <option value="rating" className="bg-neutral-900">Highest Rating</option>
            <option value="title" className="bg-neutral-900">Title (A-Z)</option>
          </select>
        </div>

      </div>

      {/* Grid Display */}
      {filtered.length === 0 ? (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-12 text-center max-w-lg mx-auto my-12 space-y-4">
          <div className="w-16 h-16 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-500 mx-auto">
            <Bookmark className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Your Watchlist is Empty</h3>
            <p className="text-xs text-neutral-400">
              Save your favorite movies and TV series to watch later in high definition.
            </p>
          </div>
          <button
            onClick={onExploreMore}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 text-white text-xs font-bold shadow-lg shadow-red-600/30 hover:bg-red-500 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Explore Catalog</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-7 gap-4 sm:gap-6 2xl:gap-8">
          {filtered.map((item) => {
            const year = item.release_date ? new Date(item.release_date).getFullYear() : '';

            return (
              <div
                key={`${item.media_type}-${item.id}`}
                onClick={() => onOpenMedia(item.id, item.media_type)}
                className="group relative flex-shrink-0 cursor-pointer select-none"
              >
                {/* Poster Container */}
                <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-lg group-hover:border-neutral-700 transition-all duration-300">
                  <img
                    src={getImageUrl(item.poster_path, 'poster')}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
                    <span className="px-1.5 py-0.5 rounded bg-neutral-950/90 text-[10px] 2xl:text-xs font-bold text-neutral-300 uppercase">
                      {item.media_type === 'movie' ? 'Movie' : 'TV'}
                    </span>
                    <button
                      onClick={(e) => handleToggleWatched(e, item.id, item.media_type)}
                      className={`p-1 2xl:p-2 rounded-lg border transition-all ${
                        item.watched
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                      title={item.watched ? 'Mark as Unwatched' : 'Mark as Watched'}
                    >
                      <CheckCircle className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                    </button>
                  </div>

                  {/* Hover Actions Overlay */}
                  <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-between z-20">
                    
                    <button
                      onClick={(e) => handleRemove(e, item.id, item.media_type)}
                      className="self-end p-2 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-red-400 transition-all"
                      title="Remove from Watchlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex justify-center my-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayMedia(item.id, item.media_type);
                        }}
                        className="p-3.5 2xl:p-5 rounded-full bg-red-600 text-white shadow-xl shadow-red-600/50 hover:scale-110 transition-transform"
                        title="Watch in HD"
                      >
                        <Play className="w-6 h-6 2xl:w-8 2xl:h-8 fill-current translate-x-0.5" />
                      </button>
                    </div>

                    <div className="text-center">
                      <span className="text-xs 2xl:text-sm font-bold text-amber-400">★ {item.vote_average?.toFixed(1) || '8.0'}</span>
                    </div>

                  </div>
                </div>

                {/* Card Title */}
                <div className="mt-2.5">
                  <h3 className="text-xs sm:text-sm 2xl:text-base font-bold text-white truncate group-hover:text-red-400 transition-colors">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] 2xl:text-xs text-neutral-400">
                    <span className="capitalize">{item.media_type}</span>
                    {year && <span>• {year}</span>}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* In-App Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-white">Clear Watchlist</h3>
              <p className="text-xs text-neutral-400">
                Are you sure you want to remove all items from your saved watchlist?
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeClearAll}
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
