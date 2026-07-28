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
  Copy,
  Check,
  ExternalLink,
  Download,
  Play,
  Tv2
} from 'lucide-react';
import { MediaType, MediaDetail } from '../types';
import { getMediaDetail, getSeasonDetail, getImageUrl } from '../services/tmdb';
import { saveContinueWatching, getPreferredServer, setPreferredServer } from '../utils/storage';
import { SERVERS } from './Navbar';

interface HDPlayerModalProps {
  mediaId: number | null;
  mediaType: MediaType;
  initialSeason?: number;
  initialEpisode?: number;
  onClose: () => void;
}

export const HDPlayerModal: React.FC<HDPlayerModalProps> = ({
  mediaId,
  mediaType,
  initialSeason = 1,
  initialEpisode = 1,
  onClose,
}) => {
  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [season, setSeason] = useState<number>(initialSeason);
  const [episode, setEpisode] = useState<number>(initialEpisode);
  const [selectedServer, setSelectedServer] = useState<string>(getPreferredServer());
  const [cinemaMode, setCinemaMode] = useState(false);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState(false);
  const [episodesList, setEpisodesList] = useState<any[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [vlcSource, setVlcSource] = useState<string>('vidsrc_cc');

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

  const currentEmbedUrl = getEmbedUrl(selectedServer === 'vlc_media' ? vlcSource : selectedServer);
  const title = detail?.title || detail?.name || 'Cinescope Player';

  // VLC Protocol URL Launcher
  const getVlcProtocolUrl = (url: string) => {
    return `vlc://${url}`;
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleDownloadM3u = () => {
    const mediaTitle = `${title}${mediaType === 'tv' ? ` S${season}E${episode}` : ''}`;
    const m3uContent = `#EXTM3U\n#EXTINF:-1,${mediaTitle}\n${currentEmbedUrl}\n`;
    const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mediaTitle.replace(/[^a-zA-Z0-9]/g, '_')}.m3u`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col transition-all duration-500 overflow-y-auto ${
      cinemaMode ? 'bg-black' : 'bg-neutral-950/95 backdrop-blur-md'
    }`}>
      
      {/* Top Header Controls Bar */}
      <div className="w-full bg-neutral-950/90 border-b border-neutral-800/80 px-4 py-3 flex items-center justify-between z-20 flex-wrap gap-3">
        
        {/* Title & Specs */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30 font-black text-xs">
            HD
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-white truncate max-w-xs sm:max-w-md">
                {title}
              </h2>
              {mediaType === 'tv' && (
                <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-xs font-bold text-red-400">
                  S{season} : E{episode}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-neutral-400">
              <span className="text-emerald-400 font-bold">1080p Ultra HD</span>
              <span>• Multi-Audio & Subtitles</span>
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

          {/* Quick VLC Stream Toggle Button */}
          <button
            onClick={() => handleServerChange(selectedServer === 'vlc_media' ? 'vidsrc_cc' : 'vlc_media')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
              selectedServer === 'vlc_media'
                ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/30'
                : 'bg-neutral-900 border-orange-500/40 text-orange-400 hover:bg-orange-600 hover:text-white'
            }`}
            title="Open VLC Streaming Media mode"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>VLC Stream</span>
          </button>

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
        
        {/* Render either VLC Media Mode Panel OR Web HTML5 Player Frame */}
        {selectedServer === 'vlc_media' ? (
          <div className="w-full bg-neutral-900/90 border border-orange-500/40 rounded-3xl p-6 shadow-2xl shadow-orange-950/50 flex flex-col space-y-6 flex-1">
            
            {/* Header Banner */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                  <Play className="w-6 h-6 fill-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    VLC Streaming Media Player
                    <span className="px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs font-bold">
                      Direct Network Stream
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Stream {title} {mediaType === 'tv' ? `(S${season} : E${episode})` : ''} directly in VLC Media Player on Windows, Mac, Linux, Android, or iOS.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedServer('vidsrc_cc')}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white text-xs font-bold"
              >
                Switch to Web Player
              </button>
            </div>

            {/* Stream Mirror Picker for VLC */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                Select Stream Mirror Source for VLC:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {[
                  { id: 'vidsrc_cc', name: 'VidSrc CC' },
                  { id: 'vidsrc_pro', name: 'VidSrc Pro' },
                  { id: 'vidsrc_xyz', name: 'VidSrc XYZ' },
                  { id: 'autoembed', name: 'AutoEmbed' },
                  { id: 'twoembed', name: '2Embed VIP' },
                  { id: 'smashy', name: 'SmashyStream' },
                ].map((src) => (
                  <button
                    key={src.id}
                    onClick={() => setVlcSource(src.id)}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                      vlcSource === src.id
                        ? 'bg-orange-600 border-orange-500 text-white shadow-md shadow-orange-600/30'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    {src.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Stream URL Input & Action Buttons */}
            <div className="space-y-3 bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
              <label className="text-xs font-bold text-neutral-300 block">
                Direct Stream Network URL:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentEmbedUrl}
                  className="flex-1 bg-neutral-900 border border-neutral-800 text-orange-300 font-mono text-xs px-3 py-2.5 rounded-xl focus:outline-none"
                />
                <button
                  onClick={() => handleCopyUrl(currentEmbedUrl)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all flex-shrink-0"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>
              </div>

              {/* Launcher Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href={getVlcProtocolUrl(currentEmbedUrl)}
                  className="px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs shadow-lg shadow-orange-600/30 flex items-center gap-2 transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Launch in VLC Player App</span>
                </a>

                <button
                  onClick={handleDownloadM3u}
                  className="px-5 py-3 rounded-xl bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-white font-bold text-xs flex items-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4 text-orange-400" />
                  <span>Download VLC Playlist (.m3u)</span>
                </button>

                <a
                  href={currentEmbedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white font-bold text-xs flex items-center gap-2 transition-all ml-auto"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Stream in Web Browser</span>
                </a>
              </div>
            </div>

            {/* How to stream in VLC step-by-step guide */}
            <div className="bg-neutral-950/60 p-4 rounded-2xl border border-neutral-800/80 space-y-3">
              <h4 className="text-xs font-black text-orange-400 uppercase tracking-wider flex items-center gap-2">
                <Info className="w-4 h-4" />
                How to Stream using VLC Media Player:
              </h4>
              <div className="grid sm:grid-cols-3 gap-3 text-xs text-neutral-300">
                <div className="bg-neutral-900/80 p-3 rounded-xl border border-neutral-800">
                  <div className="font-bold text-white mb-1">Method 1: One-Click Launch</div>
                  <p className="text-[11px] text-neutral-400">
                    Click <strong>"Launch in VLC Player App"</strong> above. If VLC Media Player is installed on your device, it will launch automatically!
                  </p>
                </div>
                <div className="bg-neutral-900/80 p-3 rounded-xl border border-neutral-800">
                  <div className="font-bold text-white mb-1">Method 2: Playlist Download</div>
                  <p className="text-[11px] text-neutral-400">
                    Click <strong>"Download VLC Playlist (.m3u)"</strong> and double-click the file to immediately play in VLC.
                  </p>
                </div>
                <div className="bg-neutral-900/80 p-3 rounded-xl border border-neutral-800">
                  <div className="font-bold text-white mb-1">Method 3: Network Stream</div>
                  <p className="text-[11px] text-neutral-400">
                    Open VLC -&gt; Click <strong>Media</strong> -&gt; <strong>Open Network Stream (Ctrl+N / Cmd+N)</strong> -&gt; Paste URL &amp; hit Play.
                  </p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* IFrame Video Frame Container */
          <div className="flex-1 flex flex-col w-full h-full space-y-2">
            <div className="flex items-center justify-between px-3 py-2 bg-neutral-900/90 rounded-2xl border border-neutral-800 text-xs text-neutral-300">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <span className="truncate">Active Server: <strong className="text-white">{SERVERS.find(s => s.id === selectedServer)?.name}</strong></span>
              </div>
              <a
                href={currentEmbedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 hover:underline ml-2 flex-shrink-0"
                title="If sandbox or iframe errors appear, click to open unrestricted stream in a new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Direct Unrestricted Stream</span>
              </a>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-xs p-3 rounded-xl flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
              <p>
                <strong>"Sandbox not allowed" Error?</strong> This happens because the AI Studio preview environment restricts third-party video players. 
                To watch the video, click the <strong>Open Direct Unrestricted Stream</strong> button above, or open this entire app in a new browser tab.
              </p>
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
              />
            </div>
          </div>
        )}

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

    </div>
  );
};
