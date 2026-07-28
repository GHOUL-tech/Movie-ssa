import React, { useState, useEffect } from 'react';
import { Play, Plus, Check, Star, Info, Film, Tv } from 'lucide-react';
import { MediaItem, MediaType } from '../types';
import { getImageUrl } from '../services/tmdb';
import { isInWatchlist, toggleWatchlist } from '../utils/storage';

interface MediaCardProps {
  item: MediaItem;
  onOpenMedia: (id: number, type: MediaType) => void;
  onPlayMedia: (id: number, type: MediaType) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  onOpenMedia,
  onPlayMedia,
}) => {
  const type: MediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
  const title = item.title || item.name || 'Untitled';
  const releaseDate = item.release_date || item.first_air_date || '';
  const year = releaseDate ? new Date(releaseDate).getFullYear() : '';

  const [inWatchlist, setInWatchlist] = useState(false);

  useEffect(() => {
    setInWatchlist(isInWatchlist(item.id, type));
  }, [item.id, type]);

  const handleToggleWatchlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = toggleWatchlist({
      id: item.id,
      media_type: type,
      title,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      vote_average: item.vote_average,
      release_date: releaseDate,
    });
    setInWatchlist(updated);
  };

  return (
    <div 
      onClick={() => onOpenMedia(item.id, type)}
      className="group relative flex-shrink-0 w-36 sm:w-48 cursor-pointer select-none"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800/80 shadow-lg group-hover:shadow-red-600/20 group-hover:border-neutral-700 transition-all duration-300 group-hover:-translate-y-1">
        
        <img
          src={getImageUrl(item.poster_path, 'poster')}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
          <span className="px-1.5 py-0.5 rounded bg-neutral-950/80 backdrop-blur border border-neutral-800 text-[10px] font-bold text-neutral-300 uppercase">
            {type === 'movie' ? 'Movie' : 'TV'}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-red-600/90 text-white font-black text-[9px] shadow-sm">
            HD 1080p
          </span>
        </div>

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-3 flex flex-col justify-between z-20">
          
          {/* Top Quick Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleToggleWatchlist}
              className={`p-2 rounded-xl border transition-all ${
                inWatchlist
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-neutral-900/90 border-neutral-700 text-white hover:bg-neutral-800'
              }`}
              title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              {inWatchlist ? <Check className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4" />}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenMedia(item.id, type);
              }}
              className="p-2 rounded-xl bg-neutral-900/90 border border-neutral-700 text-white hover:bg-neutral-800 transition-all"
              title="More Info"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

          {/* Middle Play Button */}
          <div className="flex justify-center my-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlayMedia(item.id, type);
              }}
              className="p-3.5 rounded-full bg-red-600 text-white shadow-xl shadow-red-600/50 hover:bg-red-500 hover:scale-110 active:scale-95 transition-all"
              title="Watch Now in HD"
            >
              <Play className="w-6 h-6 fill-current translate-x-0.5" />
            </button>
          </div>

          {/* Bottom Card Overview */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-amber-400">
              {item.vote_average > 0 ? (
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {item.vote_average.toFixed(1)}
                </span>
              ) : (
                <span className="text-neutral-400 font-normal">New</span>
              )}
              <span className="text-neutral-400 font-normal">{year}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Card Footer Info */}
      <div className="mt-2.5 space-y-0.5">
        <h3 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-red-400 transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
          <span className="capitalize">{type === 'movie' ? 'Movie' : 'TV Show'}</span>
          {year && <span>• {year}</span>}
        </div>
      </div>

    </div>
  );
};
