import React, { useState, useEffect } from 'react';
import { Sliders, Star, Film, Tv, Sparkles, Filter, X, RefreshCw } from 'lucide-react';
import { Genre, MediaItem, MediaType } from '../types';
import { discoverMedia, getGenres } from '../services/tmdb';
import { MediaCard } from './MediaCard';

interface ExploreFilterProps {
  onOpenMedia: (id: number, type: MediaType) => void;
  onPlayMedia: (id: number, type: MediaType) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const ExploreFilter: React.FC<ExploreFilterProps> = ({
  onOpenMedia,
  onPlayMedia,
  isOpen,
  onClose,
}) => {
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenreId, setSelectedGenreId] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>('popularity.desc');
  const [minRating, setMinRating] = useState<number>(6);
  
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Load genres list
  useEffect(() => {
    getGenres(mediaType).then(setGenres).catch(console.error);
  }, [mediaType]);

  // Execute discover search
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    discoverMedia(mediaType, {
      genreId: selectedGenreId,
      sortBy,
      minRating,
      page,
    })
      .then(({ results: items, totalPages: maxPages }) => {
        if (!isMounted) return;
        if (page === 1) {
          setResults(items);
        } else {
          setResults((prev) => [...prev, ...items]);
        }
        setTotalPages(maxPages);
      })
      .catch(console.error)
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [mediaType, selectedGenreId, sortBy, minRating, page, isOpen]);

  if (!isOpen) return null;

  const handleResetFilters = () => {
    setSelectedGenreId(undefined);
    setSortBy('popularity.desc');
    setMinRating(6);
    setPage(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-neutral-950/80 backdrop-blur-md animate-fadeIn">
      
      {/* Side Filter Drawer Panel */}
      <div className="w-full max-w-2xl h-full bg-neutral-900 border-l border-neutral-800 p-6 flex flex-col space-y-6 overflow-y-auto shadow-2xl">
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Filter Catalog</h2>
              <p className="text-xs text-neutral-400">Discover movies & series by parameters</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Form Controls */}
        <div className="space-y-6">
          
          {/* Media Type Switcher */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Catalog Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setMediaType('movie');
                  setSelectedGenreId(undefined);
                  setPage(1);
                }}
                className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                  mediaType === 'movie'
                    ? 'bg-red-600 border-red-500 text-white shadow-lg'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <Film className="w-4 h-4" />
                <span>Movies</span>
              </button>

              <button
                onClick={() => {
                  setMediaType('tv');
                  setSelectedGenreId(undefined);
                  setPage(1);
                }}
                className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                  mediaType === 'tv'
                    ? 'bg-red-600 border-red-500 text-white shadow-lg'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <Tv className="w-4 h-4" />
                <span>TV Series</span>
              </button>
            </div>
          </div>

          {/* Sort By Dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Sort Results By</label>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="w-full bg-neutral-950 border border-neutral-800 text-white font-bold text-xs p-3 rounded-xl focus:outline-none focus:border-red-500"
            >
              <option value="popularity.desc">Most Popular</option>
              <option value="vote_average.desc">Highest Rated</option>
              <option value="primary_release_date.desc">Release Date (Newest)</option>
              <option value="vote_count.desc">Most Voted</option>
            </select>
          </div>

          {/* Min Rating Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-neutral-300 uppercase tracking-wider">Minimum TMDB Rating</span>
              <span className="text-amber-400 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                {minRating} / 10
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="9"
              step="0.5"
              value={minRating}
              onChange={(e) => {
                setMinRating(Number(e.target.value));
                setPage(1);
              }}
              className="w-full accent-red-600 bg-neutral-800 h-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* Genres Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Filter by Genre</label>
              {selectedGenreId && (
                <button
                  onClick={() => {
                    setSelectedGenreId(undefined);
                    setPage(1);
                  }}
                  className="text-[11px] text-red-400 hover:underline"
                >
                  Clear Genre
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 border border-neutral-800 rounded-xl bg-neutral-950">
              {genres.map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => {
                    setSelectedGenreId(selectedGenreId === genre.id ? undefined : genre.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedGenreId === genre.id
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleResetFilters}
            className="w-full py-2.5 rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>

        </div>

        {/* Filtered Grid Output */}
        <div className="flex-1 overflow-y-auto space-y-4 pt-4 border-t border-neutral-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Filtered Results ({results.length})
          </h3>

          {loading && page === 1 ? (
            <div className="p-8 text-center text-sm text-neutral-400 animate-pulse">
              Finding matching HD titles...
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-400">
              No titles match these filters. Try lowering the minimum rating or clearing genre selection.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {results.map((item) => (
                <MediaCard
                  key={`${item.media_type || mediaType}-${item.id}`}
                  item={{ ...item, media_type: mediaType }}
                  onOpenMedia={onOpenMedia}
                  onPlayMedia={onPlayMedia}
                />
              ))}
            </div>
          )}

          {/* Load More Button */}
          {page < totalPages && (
            <button
              onClick={() => setPage((prev) => prev + 1)}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-all"
            >
              {loading ? 'Loading More...' : 'Load More Titles'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
