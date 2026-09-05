import React, { useState, useEffect } from 'react';
import { Play, Trash2, Clock, RotateCcw } from 'lucide-react';
import { ContinueWatchingItem, MediaType } from '../types';
import { getContinueWatching, removeContinueWatching } from '../utils/storage';
import { getImageUrl } from '../services/tmdb';

interface ContinueWatchingRowProps {
  onPlayMedia: (id: number, type: MediaType, season?: number, episode?: number) => void;
}

export const ContinueWatchingRow: React.FC<ContinueWatchingRowProps> = ({ onPlayMedia }) => {
  const [items, setItems] = useState<ContinueWatchingItem[]>([]);

  const loadItems = () => {
    setItems(getContinueWatching());
  };

  useEffect(() => {
    loadItems();
    const interval = setInterval(loadItems, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRemove = (e: React.MouseEvent, id: number, mediaType: MediaType) => {
    e.stopPropagation();
    removeContinueWatching(id, mediaType);
    loadItems();
  };

  if (items.length === 0) return null;

  return (
    <section className="my-8 max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-12 2xl:px-24 w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 2xl:w-8 2xl:h-8 text-red-500" />
          <h2 className="text-xl sm:text-2xl 2xl:text-4xl font-black text-white tracking-tight">
            Continue Watching
          </h2>
        </div>
        <span className="text-xs 2xl:text-base text-neutral-400 font-medium">
          Saved Progress
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 2xl:gap-6">
        {items.map((item) => {
          const isTV = item.media_type === 'tv';
          const progress = item.progress_percent || 45;

          return (
            <div
              key={`${item.media_type}-${item.id}`}
              onClick={() => onPlayMedia(item.id, item.media_type, item.season, item.episode)}
              className="group relative rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer shadow-lg hover:shadow-red-600/10"
            >
              {/* Backdrop Thumbnail */}
              <div className="relative aspect-video w-full overflow-hidden bg-neutral-950">
                <img
                  src={getImageUrl(item.backdrop_path || item.poster_path, 'backdrop')}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Overlay Play Button */}
                <div className="absolute inset-0 bg-neutral-950/50 group-hover:bg-neutral-950/30 transition-colors flex items-center justify-center">
                  <div className="p-3 2xl:p-5 rounded-full bg-red-600 text-white shadow-xl shadow-red-600/50 group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 2xl:w-8 2xl:h-8 fill-current translate-x-0.5" />
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={(e) => handleRemove(e, item.id, item.media_type)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-neutral-950/80 text-neutral-400 hover:text-white hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 z-10"
                  title="Remove from history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* TV Episode Tag */}
                {isTV && item.season && item.episode && (
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-neutral-950/90 text-white font-bold text-[10px] border border-neutral-800">
                    S{item.season}:E{item.episode}
                  </span>
                )}
              </div>

              {/* Info & Progress Bar */}
              <div className="p-3 2xl:p-5 space-y-2 2xl:space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm 2xl:text-xl font-bold text-white truncate max-w-[180px] 2xl:max-w-[240px]">
                    {item.title}
                  </h3>
                  <span className="text-[10px] 2xl:text-sm font-semibold text-red-400 flex items-center gap-1">
                    <RotateCcw className="w-3 h-3 2xl:w-4 2xl:h-4" />
                    Resume
                  </span>
                </div>

                {/* Progress bar line */}
                <div className="w-full h-1.5 2xl:h-2.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-rose-400 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </section>
  );
};
