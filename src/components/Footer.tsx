import React from 'react';
import { Film, ShieldCheck, Sparkles, Monitor, Tv, Heart, Headphones } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface FooterProps {
  onSelectGenre?: (genreId: number) => void;
  onNavigateTab?: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateTab }) => {
  const { isAdmin, openAdminModal, openSupportModal } = useAuth();
  const navigate = useNavigate();

  const handleAdminAccess = () => {
    if (isAdmin) {
      navigate('/admin');
    } else {
      openAdminModal();
    }
  };
  return (
    <footer className="bg-neutral-950 border-t border-neutral-800/80 pt-12 pb-8 px-4 sm:px-6 lg:px-8 text-neutral-400">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Top Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-3xl bg-neutral-900/60 border border-neutral-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">1080p & 4K HD</h4>
              <p className="text-xs text-neutral-400">High definition video stream</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Multi-Server HD</h4>
              <p className="text-xs text-neutral-400">Fast fallback buffer switching</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Real TMDB Catalog</h4>
              <p className="text-xs text-neutral-400">Updated daily with top releases</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Personal Watchlist</h4>
              <p className="text-xs text-neutral-400">Save favorites & track progress</p>
            </div>
          </div>
        </div>

        {/* Brand & Links */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 pt-4">
          
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
                <Film className="w-4 h-4" />
              </div>
              <span className="text-xl font-black text-white tracking-wider">
                ZINO<span className="text-red-500">VIS</span>
              </span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Zinovis is an advanced streaming catalog platform featuring real-time movie and TV series discovery, high-definition streaming embeds, and custom user watchlists.
            </p>
          </div>

          {/* Quick Nav Links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
            <div className="space-y-2">
              <h5 className="font-bold text-white uppercase tracking-wider text-[11px]">Navigation</h5>
              <ul className="space-y-1.5">
                <li><button onClick={() => onNavigateTab?.('home')} className="hover:text-white transition-colors">Home</button></li>
                <li><button onClick={() => onNavigateTab?.('movies')} className="hover:text-white transition-colors">Movies</button></li>
                <li><button onClick={() => onNavigateTab?.('tv')} className="hover:text-white transition-colors">TV Series</button></li>
                <li><button onClick={() => onNavigateTab?.('trending')} className="hover:text-white transition-colors">Trending Now</button></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h5 className="font-bold text-white uppercase tracking-wider text-[11px]">Support &amp; Portal</h5>
              <ul className="space-y-1.5">
                <li>
                  <button 
                    onClick={openSupportModal} 
                    className="hover:text-white transition-colors flex items-center gap-1.5 text-neutral-300"
                  >
                    <Headphones className="w-3 h-3 text-rose-400" />
                    <span>Live Support Chat</span>
                  </button>
                </li>

              </ul>
            </div>
          </div>

        </div>

        {/* Bottom Disclaimer */}
        <div className="pt-6 border-t border-neutral-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-4">
          <p>© {new Date().getFullYear()} Zinovis Streaming Service. Powered by TMDB API &amp; Firebase.</p>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span>Crafted with</span>
            <button
              onClick={handleAdminAccess}
              className="p-1 rounded-md hover:bg-neutral-800 transition-all group"
              title="Admin Portal Access Point (Love Emoji ❤️)"
            >
              <Heart className="w-3.5 h-3.5 text-red-500 fill-current group-hover:scale-125 transition-transform" />
            </button>
            <span>for HD Cinema Lovers</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
