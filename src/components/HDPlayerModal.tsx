import React, { useState, useEffect } from 'react';
import { 
  X, 
  Monitor, 
  ChevronLeft, 
  ChevronRight, 
  Film, 
  Tv, 
  Sparkles, 
  RotateCcw, 
  Volume2, 
  Info, 
  Sliders, 
  Moon, 
  Sun,
  Maximize2,
  ExternalLink,
  Play,
  Tv2
} from 'lucide-react';
import { MediaType, MediaDetail } from '../types';
import { getMediaDetail, getSeasonDetail, getImageUrl } from '../services/tmdb';
import { saveContinueWatching, getPreferredServer, setPreferredServer } from '../utils/storage';
import { SERVERS } from './Navbar';
import { Footer } from './Footer';

interface HDPlayerModalProps {
  mediaId: number | null;
  mediaType: MediaType;
  initialSeason?: number;
  initialEpisode?: number;
  onClose: () => void;
  onPlayMedia?: (id: number, type: MediaType, season?: number, episode?: number) => void;
}

export const HDPlayerModal: React.FC<HDPlayerModalProps> = ({
  mediaId,
  mediaType,
  initialSeason = 1,
  initialEpisode = 1,
  onClose,
  onPlayMedia,
}) => {
  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [season, setSeason] = useState<number>(initialSeason);
  const [episode, setEpisode] = useState<number>(initialEpisode);
  const [selectedServer, setSelectedServer] = useState<string>(getPreferredServer());
  const [cinemaMode, setCinemaMode] = useState(false);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState(false);
  const [episodesList, setEpisodesList] = useState<any[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  // Reset season and episode when mediaId changes
  useEffect(() => {
    setSeason(initialSeason);
    setEpisode(initialEpisode);
  }, [mediaId, initialSeason, initialEpisode]);

  useEffect(() => {
    if (!mediaId) return;
    getMediaDetail(mediaId, mediaType)
      .then((data) => {
        setDetail(data);
        saveContinueWatching({
          id: data.id,
          media_type: mediaType,
          title: data.title || data.name || 'Untitled',
          poster_path: data.poster_path,
          backdrop_path: data.backdrop_path,
          season: mediaType === 'tv' ? season : undefined,
          episode: mediaType === 'tv' ? episode : undefined,
          progress_percent: 10,
        });
      })
      .catch((err) => console.error('Failed to load detail for player:', err));
  }, [mediaId, mediaType]);

  // Load episodes when season changes for TV shows
  useEffect(() => {
    if (mediaType !== 'tv' || !mediaId) return;

    setLoadingEpisodes(true);
    getSeasonDetail(mediaId, season)
      .then((data) => {
        setEpisodesList(data.episodes || []);
      })
      .catch((err) => console.error('Failed to load episodes:', err))
      .finally(() => setLoadingEpisodes(false));
  }, [mediaId, mediaType, season]);

  // Save progress when episode changes
  useEffect(() => {
    if (!detail) return;
    saveContinueWatching({
      id: detail.id,
      media_type: mediaType,
      title: detail.title || detail.name || 'Untitled',
      poster_path: detail.poster_path,
      backdrop_path: detail.backdrop_path,
      season: mediaType === 'tv' ? season : undefined,
      episode: mediaType === 'tv' ? episode : undefined,
      progress_percent: 25,
    });
  }, [season, episode, detail]);

  if (!mediaId) return null;

  const handleServerChange = (serverId: string) => {
    setSelectedServer(serverId);
    setPreferredServer(serverId);
  };

  // Build stream embed URL based on server choice
  const getEmbedUrl = (targetServer = selectedServer): string => {
    if (targetServer === 'vidsrc_cc') {
      return mediaType === 'movie'
        ? `https://vidsrc.cc/v2/embed/movie/${mediaId}`
        : `https://vidsrc.cc/v2/embed/tv/${mediaId}/${season}/${episode}`;
    }
    if (targetServer === 'vidsrc_pro') {
      return mediaType === 'movie'
        ? `https://vidsrc.pro/embed/movie/${mediaId}`
        : `https://vidsrc.pro/embed/tv/${mediaId}/${season}/${episode}`;
    }
    if (targetServer === 'vidsrc_xyz') {
      return mediaType === 'movie'
        ? `https://vidsrc.xyz/embed/movie/${mediaId}`
        : `https://vidsrc.xyz/embed/tv/${mediaId}/${season}/${episode}`;
    }
    if (targetServer === 'autoembed') {
      return mediaType === 'movie'
        ? `https://player.autoembed.cc/embed/movie/${mediaId}`
        : `https://player.autoembed.cc/embed/tv/${mediaId}/${season}/${episode}`;
    }
    if (targetServer === 'twoembed') {
      return mediaType === 'movie'
        ? `https://www.2embed.cc/embed/${mediaId}`
        : `https://www.2embed.cc/embedtv/${mediaId}&s=${season}&e=${episode}`;
    }
    if (targetServer === 'smashy') {
      return mediaType === 'movie'
        ? `https://player.smashy.stream/movie/${mediaId}`
        : `https://player.smashy.stream/tv/${mediaId}?s=${season}&e=${episode}`;
    }
    // Fallback to VidSrc CC
    return mediaType === 'movie'
      ? `https://vidsrc.cc/v2/embed/movie/${mediaId}`
      : `https://vidsrc.cc/v2/embed/tv/${mediaId}/${season}/${episode}`;
  };

  const currentEmbedUrl = getEmbedUrl(selectedServer);
  const title = detail?.title || detail?.name || 'Cinescope Player';

  return (
    <div className={`fixed inset-0 z-50 flex flex-col transition-all duration-500 overflow-y-auto ${
      cinemaMode ? 'bg-black' : 'bg-neutral-950/95 backdrop-blur-md'
    }`}>
      
      {/* Top Header Controls Bar */}
      <div className="w-full bg-neutral-950/90 border-b border-neutral-800/80 px-4 py-3 flex items-center justify-between z-20 flex-wrap gap-3">
        
        {/* Title & Specs */}
        <div className="flex items-center gap-3 cursor-pointer group" onClick={onClose} title="Go back to Home">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30 font-black text-xs group-hover:scale-105 transition-transform">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-white tracking-wider group-hover:text-red-400 transition-colors">
                CINE<span className="text-red-500">SCOPE</span>
              </h2>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-neutral-400">
              <span className="font-bold truncate max-w-[200px]">
                {title}
              </span>
              {mediaType === 'tv' && (
                <span className="text-red-400 font-bold">
                  • S{season} : E{episode}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Server & Action Switchers */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Server Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5">
            <Monitor className="w-3.5 h-3.5 text-red-500" />
            <select
              value={selectedServer}
              onChange={(e) => handleServerChange(e.target.value)}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
            >
              {SERVERS.map((srv) => (
                <option key={srv.id} value={srv.id} className="bg-neutral-900 text-white">
                  {srv.name}
                </option>
              ))}
            </select>
          </div>

          {/* Open Unrestricted Stream Popout Button */}
          <a
            href={currentEmbedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-neutral-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Open Player in Unrestricted New Tab (Bypasses Iframe Sandbox Blockers)"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Popout Player</span>
          </a>

          {/* Episode Drawer Trigger for TV Shows */}
          {mediaType === 'tv' && (
            <button
              onClick={() => setShowEpisodeDrawer(!showEpisodeDrawer)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                showEpisodeDrawer
                  ? 'bg-red-600 border-red-500 text-white'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Episodes</span>
            </button>
          )}

          {/* Cinema Mode Toggle */}
          <button
            onClick={() => setCinemaMode(!cinemaMode)}
            className={`p-2 rounded-xl border transition-all ${
              cinemaMode
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white'
            }`}
            title={cinemaMode ? 'Turn Lights On' : 'Cinema Light Off'}
          >
            {cinemaMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Close Player */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-red-600 hover:border-red-500 transition-all ml-1"
            title="Exit Player"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex flex-col lg:flex-row items-center justify-center p-2 sm:p-4 max-w-7xl mx-auto w-full gap-4">
        
        {/* Render Web HTML5 Player Frame */}
        <div className="flex-1 flex flex-col w-full h-full space-y-2">
          <div className="flex items-center justify-between px-3 py-2 bg-neutral-900/90 rounded-2xl border border-neutral-800 text-xs text-neutral-300 flex-wrap gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              <span className="truncate">Active Server: <strong className="text-white">{SERVERS.find(s => s.id === selectedServer)?.name}</strong></span>
            </div>
            <button
              onClick={() => {
                const currentIndex = SERVERS.findIndex(s => s.id === selectedServer);
                const nextIndex = (currentIndex + 1) % SERVERS.length;
                handleServerChange(SERVERS[nextIndex].id);
              }}
              className="text-xs bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1 rounded-lg transition-all shadow-md shadow-red-600/20"
              title="If the current server is not working, click here to try the next one"
            >
              Video not working? Auto-Switch
            </button>
          </div>

          <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden border border-neutral-800/80 shadow-2xl shadow-black/90 flex-1">
            <iframe
              src={getEmbedUrl()}
              title={title}
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture; accelerometer; gyroscope; clipboard-write; screen-wake-lock"
              referrerPolicy="no-referrer"
              className="w-full h-full border-0"
              onError={() => {
                // Auto-fallback on network error
                const currentIndex = SERVERS.findIndex(s => s.id === selectedServer);
                const nextIndex = (currentIndex + 1) % SERVERS.length;
                handleServerChange(SERVERS[nextIndex].id);
              }}
            />
          </div>
        </div>

        {/* Side Episode Picker Drawer for TV Shows */}
        {mediaType === 'tv' && showEpisodeDrawer && (
          <div className="w-full lg:w-80 h-full max-h-[500px] bg-neutral-900 border border-neutral-800 rounded-3xl p-4 flex flex-col space-y-3 z-30">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="text-sm font-black text-white">Season {season} Episodes</h3>
              
              {/* Season switcher */}
              <select
                value={season}
                onChange={(e) => {
                  setSeason(Number(e.target.value));
                  setEpisode(1);
                }}
                className="bg-neutral-800 border border-neutral-700 text-xs font-bold text-white px-2 py-1 rounded-lg"
              >
                {detail?.seasons?.filter(s => s.season_number > 0).map((s) => (
                  <option key={s.id} value={s.season_number}>
                    S{s.season_number} ({s.episode_count} Ep)
                  </option>
                ))}
              </select>
            </div>

            {/* Episode List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-neutral-800">
              {loadingEpisodes ? (
                <div className="text-xs text-neutral-400 p-4 text-center">Loading episodes...</div>
              ) : (
                episodesList.map((ep) => (
                  <button
                    key={ep.id}
                    onClick={() => setEpisode(ep.episode_number)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                      episode === ep.episode_number
                        ? 'bg-red-600 text-white font-bold shadow-md shadow-red-600/30'
                        : 'bg-neutral-950/80 text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {ep.episode_number}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">{ep.name}</div>
                      <div className="text-[10px] opacity-70 truncate">{ep.runtime ? `${ep.runtime} min` : 'HD Stream'}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* TV Series Next/Prev Controls Footer */}
      {mediaType === 'tv' && (
        <div className="bg-neutral-950/90 border-t border-neutral-800/80 px-6 py-3 flex items-center justify-between max-w-7xl mx-auto w-full">
          <button
            disabled={episode <= 1}
            onClick={() => setEpisode(prev => Math.max(1, prev - 1))}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-800 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Episode</span>
          </button>

          <span className="text-xs font-bold text-neutral-400">
            Playing Season {season} • Episode {episode}
          </span>

          <button
            onClick={() => setEpisode(prev => prev + 1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all"
          >
            <span>Next Episode</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Recommendations Section */}
      {detail && (detail.recommendations?.results?.length || detail.similar?.results?.length) ? (
        <div className="max-w-7xl mx-auto w-full p-4 space-y-4 pb-12 mt-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-red-500" />
            More Movies & Series You May Like
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {Array.from(
              new Map(
                [...(detail.recommendations?.results || []), ...(detail.similar?.results || [])]
                  .filter((item) => item.poster_path)
                  .map((item) => [item.id, item])
              ).values()
            )
              .slice(0, 24)
              .map((item: any) => {
              const itemType = item.media_type || mediaType;
              const itemTitle = item.title || item.name || 'Untitled';
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (onPlayMedia) {
                      onPlayMedia(item.id, itemType, 1, 1);
                    }
                  }}
                  className="group relative aspect-[2/3] rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800 hover:border-red-500 cursor-pointer shadow transition-all"
                >
                  <img
                    src={getImageUrl(item.poster_path, 'poster')}
                    alt={itemTitle}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent p-3 flex flex-col justify-end">
                    <h4 className="text-[11px] font-bold text-white truncate">{itemTitle}</h4>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-auto w-full bg-neutral-950/90 relative z-20 border-t border-neutral-800/50">
        <Footer onNavigateTab={() => onClose()} />
      </div>

    </div>
  );
};
