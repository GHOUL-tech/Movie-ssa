import React, { useState, useEffect } from 'react';
import { Play, Info, Plus, Check, Star, Sparkles, ChevronLeft, ChevronRight, Film, Tv, Volume2 } from 'lucide-react';
import { MediaItem, MediaType } from '../types';
import { getImageUrl, GENRE_MAP } from '../services/tmdb';
import { isInWatchlist, toggleWatchlist } from '../utils/storage';

interface HeroBannerProps {
  items: MediaItem[];
  onOpenMedia: (id: number, type: MediaType) => void;
  onPlayMedia: (id: number, type: MediaType) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  items,
  onOpenMedia,
  onPlayMedia,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inWatchlist, setInWatchlist] = useState(false);

  const heroItems = items.slice(0, 6);
  const currentItem = heroItems[currentIndex];

  useEffect(() => {
    if (!currentItem) return;
    const mediaType = currentItem.media_type || (currentItem.first_air_date ? 'tv' : 'movie');
    const status = isInWatchlist(currentItem.id, mediaType);
    setInWatchlist((prev) => (prev !== status ? status : prev));
  }, [currentIndex, currentItem?.id]);

  // Auto advance slide every 7 seconds
  useEffect(() => {
    if (heroItems.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroItems.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [heroItems.length]);

  if (!currentItem) {
    return (
      <div className="w-full h-[70vh] bg-neutral-900 animate-pulse flex items-center justify-center">
        <Film className="w-12 h-12 text-neutral-700 animate-bounce" />
      </div>
    );
  }

  const title = currentItem.title || currentItem.name || 'Featured Title';
  const type: MediaType = currentItem.media_type || (currentItem.first_air_date ? 'tv' : 'movie');
  const releaseDate = currentItem.release_date || currentItem.first_air_date || '';
  const year = releaseDate ? new Date(releaseDate).getFullYear() : '2024';
  const genres = currentItem.genre_ids?.map(id => GENRE_MAP[id]).filter(Boolean).slice(0, 3) || ['Cinema', 'Popular'];

  const handleToggleWatchlist = () => {
    const updated = toggleWatchlist({
      id: currentItem.id,
      media_type: type,
      title,
      poster_path: currentItem.poster_path,
      backdrop_path: currentItem.backdrop_path,
      vote_average: currentItem.vote_average,
      release_date: releaseDate,
    });
    setInWatchlist(updated);
  };

  return (
    <div className="relative w-full h-[70vh] sm:h-[80vh] min-h-[460px] sm:min-h-[550px] max-h-[800px] 2xl:max-h-[1200px] bg-neutral-950 overflow-hidden group">
      
      {/* Background Backdrop Image */}
      <div className="absolute inset-0">
        <img
          src={getImageUrl(currentItem.backdrop_path, 'backdrop')}
          alt={title}
          className="w-full h-full object-cover object-top transition-transform duration-1000 scale-105 group-hover:scale-100"
        />
        {/* Cinematic Vignette Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-transparent w-full md:w-3/4" />
        <div className="absolute inset-0 bg-neutral-950/30 backdrop-blur-[1px]" />
      </div>

      {/* Content Overlay */}
      <div className="relative max-w-full 2xl:max-w-[2560px] mx-auto h-full px-4 sm:px-6 lg:px-12 2xl:px-24 flex flex-col justify-end pb-10 sm:pb-20 2xl:pb-32 pt-20 sm:pt-28">
        <div className="max-w-2xl 2xl:max-w-4xl space-y-3 sm:space-y-4 2xl:space-y-6">
          
          {/* Header Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs 2xl:text-base font-semibold">
            <span className="px-2.5 py-1 rounded-md bg-red-600 text-white font-bold tracking-wider uppercase flex items-center gap-1 shadow-lg shadow-red-600/30">
              <Sparkles className="w-3 h-3 fill-current" />
              Zinovis Spotlight
            </span>
            <span className="px-2 py-0.5 rounded bg-neutral-900/90 border border-neutral-700 text-neutral-200 font-bold">
              {type === 'movie' ? 'MOVIE' : 'TV SERIES'}
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold">
              4K ULTRA HD
            </span>
            {currentItem.vote_average > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {currentItem.vote_average.toFixed(1)} Rating
              </span>
            )}
            <span className="text-neutral-400 font-medium">{year}</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-5xl md:text-6xl 2xl:text-8xl font-black text-white tracking-tight leading-tight sm:leading-none drop-shadow-md break-words font-display">
            {title}
          </h1>

          {/* Genres Chips */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1">
            {genres.map((g, idx) => (
              <span key={idx} className="text-xs 2xl:text-base font-medium text-neutral-300 px-2.5 py-0.5 sm:py-1 2xl:px-4 2xl:py-2 rounded-full bg-neutral-900/80 border border-neutral-800">
                {g}
              </span>
            ))}
          </div>

          {/* Overview */}
          <p className="text-xs sm:text-base 2xl:text-2xl text-neutral-300 line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-xl 2xl:max-w-3xl font-normal drop-shadow">
            {currentItem.overview || 'Stream this block-buster hit now in full High Definition on Zinovis with multi-server support.'}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 2xl:gap-5 pt-2 sm:pt-3 2xl:pt-6">
            
            {/* Play Button */}
            <button
              onClick={() => onPlayMedia(currentItem.id, type)}
              className="flex items-center gap-2 sm:gap-2.5 px-4 sm:px-6 py-2.5 sm:py-3.5 2xl:px-8 2xl:py-5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-base 2xl:text-xl shadow-xl shadow-red-600/40 hover:shadow-red-500/60 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 2xl:w-7 2xl:h-7 fill-current" />
              <span>Watch in HD</span>
            </button>

            {/* Watchlist Toggle */}
            <button
              onClick={handleToggleWatchlist}
              className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3.5 2xl:px-8 2xl:py-5 rounded-2xl font-bold text-xs sm:text-base 2xl:text-xl border transition-all ${
                inWatchlist
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-600/30'
                  : 'bg-neutral-900/80 border-neutral-700/80 text-white hover:bg-neutral-800'
              }`}
            >
              {inWatchlist ? <Check className="w-4 h-4 sm:w-5 sm:h-5 2xl:w-7 2xl:h-7 text-emerald-400" /> : <Plus className="w-4 h-4 sm:w-5 sm:h-5 2xl:w-7 2xl:h-7" />}
              <span>{inWatchlist ? 'In Watchlist' : 'Watchlist'}</span>
            </button>

            {/* More Details Button */}
            <button
              onClick={() => onOpenMedia(currentItem.id, type)}
              className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3.5 2xl:px-8 2xl:py-5 rounded-2xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/80 text-white font-bold text-xs sm:text-base 2xl:text-xl transition-all"
            >
              <Info className="w-4 h-4 sm:w-5 sm:h-5 2xl:w-7 2xl:h-7 text-neutral-300" />
              <span>Details</span>
            </button>
          </div>

        </div>
      </div>

      {/* Slider Controls */}
      {heroItems.length > 1 && (
        <>
          <button
            onClick={() => setCurrentIndex((prev) => (prev === 0 ? heroItems.length - 1 : prev - 1))}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-neutral-900/60 border border-neutral-800 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 hover:border-red-500 transition-all z-10"
            title="Previous"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % heroItems.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-neutral-900/60 border border-neutral-800 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 hover:border-red-500 transition-all z-10"
            title="Next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Indicator Dots */}
          <div className="absolute bottom-6 right-6 flex items-center gap-2 z-10">
            {heroItems.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all ${
                  currentIndex === idx ? 'w-8 bg-red-600 shadow-md shadow-red-600/50' : 'w-2 bg-neutral-700 hover:bg-neutral-500'
                }`}
              />
            ))}
          </div>
        </>
      )}

    </div>
  );
};
