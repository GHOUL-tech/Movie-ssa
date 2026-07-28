import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, LucideIcon } from 'lucide-react';
import { MediaItem, MediaType } from '../types';
import { MediaCard } from './MediaCard';

interface MediaRowProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  items: MediaItem[];
  onOpenMedia: (id: number, type: MediaType) => void;
  onPlayMedia: (id: number, type: MediaType) => void;
}

export const MediaRow: React.FC<MediaRowProps> = ({
  title,
  subtitle,
  icon: Icon,
  items,
  onOpenMedia,
  onPlayMedia,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="relative my-8 sm:my-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto group/row">
      
      {/* Section Header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-red-500" />}
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>
          )}
        </div>

        {/* Scroll Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-red-600 hover:border-red-500 transition-all"
            title="Scroll Left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-red-600 hover:border-red-500 transition-all"
            title="Scroll Right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Area */}
      <div
        ref={rowRef}
        className="flex items-center gap-4 overflow-x-auto scrollbar-none py-2 px-1 -mx-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item) => (
          <MediaCard
            key={`${item.media_type || 'm'}-${item.id}`}
            item={item}
            onOpenMedia={onOpenMedia}
            onPlayMedia={onPlayMedia}
          />
        ))}
      </div>

    </section>
  );
};
