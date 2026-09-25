import React, { useState, useEffect, useRef } from 'react';
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
  Tv2, 
  Lock, 
  Crown, 
  Tag, 
  Zap, 
  Gift, 
  AlertCircle, 
  CheckCircle2, 
  Languages, 
  Headphones, 
  Globe, 
  Award, 
  Star, 
  Check, 
  ShieldCheck, 
  Smartphone, 
  Maximize, 
  RefreshCw, 
  Layers, 
  Cpu, 
  Compass, 
  Download,
  Power 
} from 'lucide-react';
import Hls from 'hls.js';
import { MediaType, MediaDetail, NuvioStream } from '../types';
import { getMediaDetail, getSeasonDetail, getImageUrl } from '../services/tmdb';
import { 
  fetchNuvioStreams, 
  getProxiedStreamUrl, 
  detectRegionalAndDubOptions, 
  DEFAULT_NUVIO_REPOSITORIES,
  AudioTrackOption 
} from '../services/nuvioService';
import { 
  saveContinueWatching, 
  addToWatchHistory, 
  checkUserHasActiveSubscription,
  getEnabledRepositories,
  setRepositoryEnabled,
  setAllRepositoriesEnabled,
  resetProviderSettings
} from '../utils/storage';
import { useAuth } from '../context/AuthContext';
import { Footer } from './Footer';
import { NuvioProvidersModal } from './NuvioProvidersModal';

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
  const { 
    currentUser, 
    isLoggedIn, 
    isSubscriptionRequired, 
    shopUrl, 
    redeemSubscriptionCode, 
    openAuthModal, 
    refreshUserData 
  } = useAuth();

  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [season, setSeason] = useState<number>(initialSeason);
  const [episode, setEpisode] = useState<number>(initialEpisode);
  const [cinemaMode, setCinemaMode] = useState(false);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState(false);
  const [episodesList, setEpisodesList] = useState<any[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  // Nuvio Providers & Direct Streaming Engine
  const [playerMode, setPlayerMode] = useState<'direct' | 'embed'>('direct');
  const [selectedNuvioProvider, setSelectedNuvioProvider] = useState<string>('auto');
  const [nuvioStreams, setNuvioStreams] = useState<NuvioStream[]>([]);
  const [selectedStream, setSelectedStream] = useState<NuvioStream | null>(null);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [showNuvioModal, setShowNuvioModal] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [repoStatus, setRepoStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setRepoStatus(getEnabledRepositories());
  }, [showNuvioModal, reloadTrigger]);

  const activeReposCount = DEFAULT_NUVIO_REPOSITORIES.filter(
    r => repoStatus[r.id.toLowerCase()] !== false
  ).length;

  // Audio Dub state
  const [audioDubs, setAudioDubs] = useState<AudioTrackOption[]>([]);
  const [selectedDubId, setSelectedDubId] = useState<string>('original');
  const [dubNotice, setDubNotice] = useState<string | null>(null);

  // Quick In-Player Code Redemption State
  const [inPlayerCode, setInPlayerCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState('');
  const [redeemSuccess, setRedeemSuccess] = useState('');

  // Mobile & Android Protection State
  const [showAndroidGuide, setShowAndroidGuide] = useState<boolean>(false);

  // HTML5 Video & HLS refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Guard against aggressive third-party embed top-window redirects
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      return (e.returnValue = '');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Screen Wake Lock API
  useEffect(() => {
    let wakeLockSentinel: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && (navigator as any).wakeLock) {
          wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        }
      } catch {
        // Silently ignore if unsupported
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, []);

  // Fullscreen and Landscape Orientation for Android Phones
  const handleMobileFullscreen = async () => {
    const playerEl = document.getElementById('zinovis-player-wrapper');
    if (playerEl) {
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      } else {
        await playerEl.requestFullscreen().catch(() => {});
        try {
          if (screen.orientation && 'lock' in screen.orientation) {
            await (screen.orientation as any).lock('landscape').catch(() => {});
          }
        } catch {
          // ignore
        }
      }
    }
  };

  const hasAccess = !isSubscriptionRequired || checkUserHasActiveSubscription(currentUser);

  // Reset season and episode when mediaId changes
  useEffect(() => {
    setSeason(initialSeason);
    setEpisode(initialEpisode);
  }, [mediaId, initialSeason, initialEpisode]);

  // Load media details
  useEffect(() => {
    if (!mediaId) return;
    getMediaDetail(mediaId, mediaType)
      .then((data) => {
        setDetail(data);
        setAudioDubs(detectRegionalAndDubOptions(data));
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
        addToWatchHistory({
          id: data.id,
          media_type: mediaType,
          title: data.title || data.name || 'Untitled',
          poster_path: data.poster_path,
          backdrop_path: data.backdrop_path,
          vote_average: data.vote_average,
          season: mediaType === 'tv' ? season : undefined,
          episode: mediaType === 'tv' ? episode : undefined,
          progress_percent: 25,
        });
        refreshUserData();
      })
      .catch((err) => console.error('Failed to load detail for player:', err));
  }, [mediaId, mediaType]);

  // Fetch Nuvio Streams from Scrapers (4KHDHub, StreamFlix, Airflix, etc.)
  useEffect(() => {
    if (!mediaId) return;

    let isCancelled = false;
    setLoadingStreams(true);

    const loadStreams = async () => {
      try {
        let streams = await fetchNuvioStreams(mediaId, mediaType, season, episode, selectedNuvioProvider);
        if (isCancelled) return;

        // If a specific provider returned 0 streams, immediately query all enabled providers
        if (streams.length === 0 && selectedNuvioProvider !== 'auto') {
          streams = await fetchNuvioStreams(mediaId, mediaType, season, episode, 'auto');
          if (isCancelled) return;
        }

        if (streams.length > 0) {
          setNuvioStreams(streams);
          setSelectedStream(streams[0]);
          setPlayerMode(streams[0].format === 'embed' ? 'embed' : 'direct');
        } else {
          setNuvioStreams([]);
          setSelectedStream(null);
        }
      } catch (err) {
        console.warn('Nuvio streams fetch error:', err);
        if (!isCancelled) {
          setNuvioStreams([]);
          setSelectedStream(null);
        }
      } finally {
        if (!isCancelled) {
          setLoadingStreams(false);
        }
      }
    };

    loadStreams();

    return () => {
      isCancelled = true;
    };
  }, [mediaId, mediaType, season, episode, selectedNuvioProvider, reloadTrigger]);

  // Handle HLS / Direct HTML5 Video Player setup
  useEffect(() => {
    if (playerMode !== 'direct' || !selectedStream || !videoRef.current) return;

    const video = videoRef.current;
    const streamUrl = selectedStream.url;

    // Clean up previous HLS instance if any
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isM3u8 = selectedStream.format === 'm3u8' || streamUrl.includes('.m3u8');

    if (isM3u8) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90
        });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            console.warn('HLS stream fatal error, falling back to proxy or embed:', data);
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                setPlayerMode('embed');
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native Safari HLS
        video.src = streamUrl;
        video.play().catch(() => {});
      }
    } else {
      // Direct MP4 / MKV: stream via our range proxy for CORS & Referer bypass
      const proxied = getProxiedStreamUrl(streamUrl, selectedStream.headers?.Referer);
      video.src = proxied;
      video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [playerMode, selectedStream]);

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

  const handleDubChange = (dub: AudioTrackOption) => {
    setSelectedDubId(dub.id);
    if (dub.recommendedProvider) {
      setSelectedNuvioProvider(dub.recommendedProvider);
    }
    setDubNotice(`Switched audio track to ${dub.name}. Using provider: ${dub.recommendedProvider || 'Nuvio Engine'}.`);
    setTimeout(() => {
      setDubNotice(null);
    }, 6000);
  };

  const title = detail?.title || detail?.name || 'Zinovis Player';

  const handleQuickRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setRedeemError('');
    setRedeemSuccess('');

    if (!isLoggedIn) {
      openAuthModal('login');
      return;
    }

    if (!inPlayerCode.trim()) {
      setRedeemError('Please enter a valid subscription code.');
      return;
    }

    setIsRedeeming(true);
    try {
      const res = await redeemSubscriptionCode(inPlayerCode.trim());
      if (res.success) {
        setRedeemSuccess('VIP Subscription Activated! Enjoy streaming.');
        setInPlayerCode('');
      } else {
        setRedeemError(res.message);
      }
    } catch (err: any) {
      setRedeemError(err?.message || 'Failed to redeem code.');
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${cinemaMode ? 'bg-black' : 'bg-black/95 backdrop-blur-xl'} flex flex-col justify-between transition-colors duration-300 animate-fade-in`}>
      
      {/* Top Header Control Bar */}
      <div className="flex items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3.5 bg-neutral-950/80 border-b border-neutral-800/80 backdrop-blur-md sticky top-0 z-40">
        
        {/* Media Title & Badges */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 flex-shrink-0">
            {mediaType === 'tv' ? <Tv className="w-4 h-4 sm:w-5 sm:h-5" /> : <Film className="w-4 h-4 sm:w-5 sm:h-5" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base md:text-lg font-black text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md">
              {title}
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-neutral-400">
              <span className="capitalize">{mediaType === 'tv' ? 'Series' : 'Feature Film'}</span>
              <span>•</span>
              {playerMode === 'direct' && selectedStream ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-emerald-400" />
                  <span>{selectedStream.providerName} ({selectedStream.quality})</span>
                </span>
              ) : (
                <span className="text-amber-400 font-bold">
                  {selectedStream ? `${selectedStream.providerName} (${selectedStream.quality})` : `${activeReposCount} APIs Active`}
                </span>
              )}
              {mediaType === 'tv' && (
                <span className="text-red-400 font-bold whitespace-nowrap">
                  • S{season} : E{episode}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls & Nuvio Hub Trigger */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          
          {/* Nuvio Providers & APIs ON/OFF Button */}
          <button
            onClick={() => setShowNuvioModal(true)}
            className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-red-600/20 cursor-pointer"
            title="Configure and Toggle 6 Provider Repositories ON/OFF"
          >
            <Power className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">APIs & Providers</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
              activeReposCount > 0 ? 'bg-black/30 text-emerald-300' : 'bg-red-950 text-red-300'
            }`}>
              {activeReposCount}/{DEFAULT_NUVIO_REPOSITORIES.length} ON
            </span>
          </button>

          {/* Quick Reload Streams Button */}
          <button
            onClick={() => setReloadTrigger(prev => prev + 1)}
            disabled={loadingStreams}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
            title="Reload Streams"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStreams ? 'animate-spin text-red-500' : ''}`} />
          </button>

          {/* Player Mode Switcher: Direct HTML5 Video vs Embed Player */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-0.5">
            <button
              onClick={() => setPlayerMode('direct')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                playerMode === 'direct'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Play via HTML5 direct player"
            >
              <Zap className="w-3 h-3" />
              <span className="hidden md:inline">Direct Video</span>
            </button>
            <button
              onClick={() => setPlayerMode('embed')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                playerMode === 'embed'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Play via cloud embed player"
            >
              <Monitor className="w-3 h-3" />
              <span className="hidden md:inline">Embed Player</span>
            </button>
          </div>

          {/* Android Streaming Guide */}
          <button
            onClick={() => setShowAndroidGuide(true)}
            className="px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Android App Streaming & Ad Removal Guide"
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden lg:inline">Android Guide</span>
          </button>

          {/* Episode Drawer Trigger */}
          {mediaType === 'tv' && hasAccess && (
            <button
              onClick={() => setShowEpisodeDrawer(!showEpisodeDrawer)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                showEpisodeDrawer
                  ? 'bg-red-600 border-red-500 text-white'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Episodes</span>
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={handleMobileFullscreen}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
            title="Fullscreen Landscape (Android & Mobile)"
          >
            <Maximize className="w-4 h-4 text-neutral-300" />
          </button>

          {/* Cinema Mode Toggle */}
          <button
            onClick={() => setCinemaMode(!cinemaMode)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
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
            className="p-2 sm:p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-red-600 hover:border-red-500 transition-all cursor-pointer ml-1"
            title="Exit Player"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex flex-col lg:flex-row items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 max-w-full 2xl:max-w-[2560px] mx-auto w-full gap-4 md:gap-6">
        
        {/* Render HTML5 Video Player Frame or Subscription Paywall */}
        <div className="flex-1 flex flex-col w-full h-full space-y-2 md:space-y-4">
          
          {/* Quick Stream & Provider Source Bar */}
          <div className="flex items-center justify-between px-3 py-2 md:px-4 md:py-2.5 bg-neutral-900/95 rounded-2xl border border-neutral-800 text-xs text-neutral-300 flex-wrap gap-2 shadow-sm">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 flex-shrink-0 mr-1">
                <Layers className="w-3.5 h-3.5 text-red-500" />
                <span>Nuvio Stream Sources:</span>
              </span>

              {/* Quick Nuvio Scraper Pills */}
              {[
                { id: 'auto', label: 'Auto (Best Multi-Source)' },
                { id: 'vidlink', label: 'Vidlink (Fast HD)' },
                { id: 'streamflix', label: 'StreamFlix' },
                { id: 'allanime', label: 'AllAnime (Sub/Dub)' },
                { id: 'moviesdrive', label: 'MoviesDrive' },
                { id: '4khdhub', label: '4KHDHub' },
                { id: 'airflix', label: 'Airflix' },
                { id: 'tamilmv', label: 'TamilMV' }
              ].map((prov) => {
                const isActive = selectedNuvioProvider === prov.id;
                return (
                  <button
                    key={prov.id}
                    onClick={() => {
                      setSelectedNuvioProvider(prov.id);
                    }}
                    className={`px-2.5 py-1 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/30 border border-red-500'
                        : 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700/50'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-emerald-400'}`} />
                    <span>{prov.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 flex-wrap ml-auto">
              {loadingStreams ? (
                <span className="text-[11px] text-amber-300 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20 flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Querying Nuvio Scrapers...</span>
                </span>
              ) : nuvioStreams.length > 0 ? (
                <span className="text-[11px] text-emerald-300 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{nuvioStreams.length} Verified Streams Found</span>
                </span>
              ) : (
                <span className="text-[11px] text-blue-300 font-semibold bg-blue-500/10 px-2.5 py-1 rounded-xl border border-blue-500/20 flex items-center gap-1.5">
                  <Monitor className="w-3 h-3" />
                  <span>Fast Stream Ready</span>
                </span>
              )}
            </div>
          </div>

          {/* Stream Switcher Bar (always visible when multiple streams are available) */}
          {nuvioStreams.length > 1 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-950/70 border border-neutral-800/80 rounded-2xl overflow-x-auto no-scrollbar text-xs">
              <span className="text-[10px] font-bold text-neutral-400 flex items-center gap-1 flex-shrink-0">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Stream Sources:</span>
              </span>
              {nuvioStreams.map((st, idx) => {
                const isSelected = selectedStream?.id === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => {
                      setSelectedStream(st);
                      setPlayerMode(st.format === 'embed' || !st.isDirect ? 'embed' : 'direct');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30'
                        : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800'
                    }`}
                  >
                    <span>Server {idx + 1}</span>
                    <span className={`text-[10px] px-1 rounded ${isSelected ? 'bg-black/20 text-black' : 'bg-neutral-800 text-amber-400'}`}>
                      {st.quality}
                    </span>
                    <span className="text-[10px] opacity-75">{st.name.split('-')[0].trim()}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Player Container */}
          <div id="zinovis-player-wrapper" className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden border border-neutral-800/80 shadow-2xl shadow-black/90 flex-1 min-h-[300px] md:min-h-[500px] lg:min-h-[600px] 2xl:min-h-[800px] flex items-center justify-center">
            {hasAccess ? (
              loadingStreams ? (
                /* Loading Streams Spinner */
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center bg-neutral-950">
                  <RefreshCw className="w-10 h-10 animate-spin text-red-500" />
                  <p className="text-sm font-bold text-white">Extracting HD Streams from Active Nuvio Scrapers...</p>
                  <p className="text-xs text-neutral-400">Searching 4K & 1080p direct video streams across enabled repositories</p>
                </div>
              ) : selectedStream ? (
                playerMode === 'embed' || selectedStream.format === 'embed' || !selectedStream.isDirect ? (
                  /* Embed Stream Player */
                  <iframe
                    key={selectedStream.id}
                    src={selectedStream.url}
                    title={title}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    className="w-full h-full border-0"
                  />
                ) : (
                  /* Native HTML5 Direct Player with HLS support */
                  <video
                    ref={videoRef}
                    controls
                    autoPlay
                    playsInline
                    controlsList="nodownload"
                    className="w-full h-full object-contain bg-black"
                    onError={() => {
                      console.log('Direct HTML5 playback error, switching to verified embed stream');
                      const embedFallback = nuvioStreams.find(s => s.format === 'embed') || nuvioStreams[0];
                      if (embedFallback && embedFallback.id !== selectedStream.id) {
                        setSelectedStream(embedFallback);
                      }
                      setPlayerMode('embed');
                    }}
                  />
                )
              ) : (
                /* No Streams Found or All Providers Turned OFF */
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6 sm:p-10 text-center bg-gradient-to-b from-neutral-950 via-neutral-900 to-black">
                  <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
                    <Power className="w-7 h-7" />
                  </div>
                  <div className="space-y-1.5 max-w-md">
                    <h3 className="text-lg sm:text-xl font-black text-white">
                      {activeReposCount === 0 
                        ? 'All 6 Streaming Repositories are Turned OFF' 
                        : 'No Streams Found with Active Providers'}
                    </h3>
                    <p className="text-xs text-neutral-400">
                      {activeReposCount === 0
                        ? 'You have toggled all 6 Nuvio provider repositories OFF. Turn them ON to search and stream this title.'
                        : 'None of the currently enabled scrapers returned an active stream. Try turning on additional repositories or resetting providers to default.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-center pt-2">
                    <button
                      onClick={() => {
                        setAllRepositoriesEnabled(DEFAULT_NUVIO_REPOSITORIES.map(r => r.id), true);
                        setSelectedNuvioProvider('auto');
                        setReloadTrigger(prev => prev + 1);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all shadow-lg shadow-red-600/30 cursor-pointer flex items-center gap-2"
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      <span>Turn All 6 Repositories ON</span>
                    </button>
                    <button
                      onClick={() => {
                        resetProviderSettings();
                        setSelectedNuvioProvider('auto');
                        setReloadTrigger(prev => prev + 1);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs transition-all cursor-pointer flex items-center gap-2 border border-neutral-700"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reset Providers to Default</span>
                    </button>
                    <button
                      onClick={() => setShowNuvioModal(true)}
                      className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs transition-all cursor-pointer flex items-center gap-2 border border-neutral-700"
                    >
                      <Compass className="w-4 h-4" />
                      <span>Configure Providers (ON/OFF)</span>
                    </button>
                  </div>
                </div>
              )
            ) : (
              /* VIP Subscription Paywall Gate */
              <div className="w-full h-full p-6 sm:p-10 flex flex-col items-center justify-center text-center bg-gradient-to-b from-neutral-950 via-neutral-900 to-black z-20 space-y-6 max-w-2xl mx-auto">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center text-red-500 shadow-2xl shadow-red-500/20">
                  <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" />
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider">
                    <Crown className="w-3.5 h-3.5 fill-amber-400" />
                    Subscription Required
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white">
                    Unlock Full HD Streaming Pass
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-400 max-w-lg mx-auto">
                    Access to streaming on Zinovis currently requires an active VIP Subscription pass code.
                  </p>
                </div>

                {/* Purchase Shop Link */}
                <div className="w-full p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-red-400" />
                      <span>Need a Subscription Code?</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      You can buy subscription code from our official shop:
                    </p>
                    <div className="text-[11px] font-mono text-red-400 font-bold break-all">
                      {shopUrl}
                    </div>
                  </div>

                  <a
                    href={shopUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-red-600/30 flex-shrink-0"
                  >
                    <Gift className="w-4 h-4" />
                    <span>Buy Subscription Code</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Quick In-Player Redeem Form */}
                {isLoggedIn ? (
                  <form onSubmit={handleQuickRedeem} className="w-full space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Enter subscription code (e.g. ZNV-1M-XXXX-XXXX)"
                        value={inPlayerCode}
                        onChange={(e) => setInPlayerCode(e.target.value)}
                        className="flex-1 px-4 py-3 bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-2xl text-xs sm:text-sm text-white font-mono uppercase placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                      <button
                        type="submit"
                        disabled={isRedeeming || !inPlayerCode.trim()}
                        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 flex-shrink-0 cursor-pointer"
                      >
                        <Zap className="w-4 h-4 fill-current" />
                        <span>{isRedeeming ? 'Unlocking...' : 'Redeem & Play'}</span>
                      </button>
                    </div>

                    {redeemError && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2 text-left">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{redeemError}</span>
                      </div>
                    )}

                    {redeemSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 text-left">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        <span>{redeemSuccess}</span>
                      </div>
                    )}
                  </form>
                ) : (
                  <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => openAuthModal('login')}
                      className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      Sign In to Redeem Code
                    </button>
                    <button
                      onClick={() => openAuthModal('signup')}
                      className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all cursor-pointer"
                    >
                      Create Free Account
                    </button>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Audio Tracks & Dubbed Languages Bar ("Under Player") */}
          <div className="w-full bg-neutral-900/80 border border-neutral-800 rounded-2xl p-3 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                  <Languages className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <span>Available Audio & Regional Tracks</span>
                    <span className="text-[10px] font-normal text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full">
                      {audioDubs.length} Tracks Configured
                    </span>
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Switch between Original HD, Hindi Dub (Dual Audio), Tamil Audio, Japanese & Spanish streams
                  </p>
                </div>
              </div>

              {/* Hindi Dub Badge Indicator */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                  <span>🇮🇳</span> Dual Audio Supported
                </span>
              </div>
            </div>

            {/* Dub & Audio Track Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {audioDubs.map((dub) => {
                const isSelected = selectedDubId === dub.id;
                return (
                  <button
                    key={dub.id}
                    onClick={() => handleDubChange(dub)}
                    className={`group px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${
                      isSelected
                        ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/30'
                        : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">{dub.flag || '🎧'}</span>
                    <span>{dub.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-red-700/80 text-red-100'
                        : 'bg-neutral-800 text-neutral-400 group-hover:text-neutral-200'
                    }`}>
                      {dub.badge}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white ml-0.5" />}
                  </button>
                );
              })}
            </div>

            {/* Notice when Dub switched */}
            {dubNotice && (
              <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-center gap-2">
                <Headphones className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="flex-1">{dubNotice}</span>
              </div>
            )}
          </div>

          {/* Nuvio Multi-Source Stream Intel & Manifests Hub */}
          <div className="w-full bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/60 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-white">
                      Nuvio Provider Multi-Source Engine
                    </h4>
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                      {activeReposCount}/{DEFAULT_NUVIO_REPOSITORIES.length} Repos ON
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Live stream extraction via 200+ verified Nuvio community scrapers across 6 manifests (click any repo to toggle ON/OFF)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowNuvioModal(true)}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span>Configure APIs (ON/OFF)</span>
              </button>
            </div>

            {/* Repositories Quick Status Chips with ON/OFF Toggle */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
              {DEFAULT_NUVIO_REPOSITORIES.map((repo) => {
                const isEnabled = repoStatus[repo.id.toLowerCase()] !== false;
                return (
                  <div
                    key={repo.id}
                    onClick={() => {
                      const next = !isEnabled;
                      setRepositoryEnabled(repo.id, next);
                      setRepoStatus(prev => ({ ...prev, [repo.id.toLowerCase()]: next }));
                      setReloadTrigger(prev => prev + 1);
                    }}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer space-y-1 ${
                      isEnabled
                        ? 'bg-neutral-950/80 border-neutral-800 hover:border-emerald-500/50 shadow-sm'
                        : 'bg-neutral-950/40 border-neutral-900 opacity-60'
                    }`}
                    title={isEnabled ? `${repo.name} is ON (Click to turn OFF)` : `${repo.name} is OFF (Click to turn ON)`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-[11px] truncate">{repo.name}</span>
                      <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                    </div>
                    <div className="text-[10px] flex items-center justify-between">
                      <span className="text-neutral-400">{repo.scrapersCount} scrapers</span>
                      <span className={`font-bold ${isEnabled ? 'text-emerald-400' : 'text-neutral-500'}`}>
                        {isEnabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Current Active Stream Details */}
            {selectedStream ? (
              <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="text-emerald-400">Active Source:</span>
                    <span>{selectedStream.title || selectedStream.name}</span>
                  </div>
                  <div className="text-[11px] text-neutral-400 flex items-center gap-2 flex-wrap">
                    <span>Provider: <strong className="text-neutral-200">{selectedStream.providerName}</strong></span>
                    <span>•</span>
                    <span>Repo: <strong className="text-neutral-200">{selectedStream.repoName}</strong></span>
                    <span>•</span>
                    <span>Quality: <strong className="text-amber-400">{selectedStream.quality}</strong></span>
                    {selectedStream.size && (
                      <>
                        <span>•</span>
                        <span>Size: <strong className="text-blue-400">{selectedStream.size}</strong></span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                    High Speed Direct Stream
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-neutral-400 py-1 flex items-center justify-between">
                <span>All 6 Nuvio provider repositories are connected and ready to stream.</span>
                <span className="text-[10px] font-mono text-emerald-400">Status: Healthy</span>
              </div>
            )}
          </div>
        </div>

        {/* Side Episode Picker Drawer for TV Shows */}
        {mediaType === 'tv' && showEpisodeDrawer && (
          <div className="w-full lg:w-80 2xl:w-96 h-full lg:max-h-[800px] bg-neutral-900 border border-neutral-800 rounded-3xl p-4 flex flex-col space-y-3 z-30">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="text-sm md:text-base font-black text-white">Season {season} Episodes</h3>
              
              {/* Season switcher */}
              <select
                value={season}
                onChange={(e) => {
                  setSeason(Number(e.target.value));
                  setEpisode(1);
                }}
                className="bg-neutral-800 border border-neutral-700 text-xs md:text-sm font-bold text-white px-2 py-1 md:px-3 md:py-2 rounded-lg cursor-pointer"
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
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
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
        <div className="bg-neutral-950/90 border-t border-neutral-800/80 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between max-w-full 2xl:max-w-[2560px] mx-auto w-full">
          <button
            disabled={episode <= 1}
            onClick={() => setEpisode(prev => Math.max(1, prev - 1))}
            className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-white font-bold text-xs md:text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-800 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Previous Episode</span>
            <span className="sm:hidden">Prev</span>
          </button>

          <span className="text-xs md:text-base font-bold text-neutral-400">
            Playing Season {season} • Episode {episode}
          </span>

          <button
            onClick={() => setEpisode(prev => prev + 1)}
            className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs md:text-sm shadow-lg shadow-red-600/30 transition-all cursor-pointer"
          >
            <span className="hidden sm:inline">Next Episode</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      )}

      {/* Recommendations Section */}
      {detail && (detail.recommendations?.results?.length || detail.similar?.results?.length) ? (
        <div className="max-w-full 2xl:max-w-[2560px] mx-auto w-full p-4 md:p-8 space-y-4 md:space-6 pb-12 mt-4 md:mt-8">
          <h3 className="text-lg md:text-2xl font-bold text-white flex items-center gap-2">
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

      {/* Nuvio Providers Ecosystem Manager Modal */}
      <NuvioProvidersModal
        isOpen={showNuvioModal}
        onClose={() => setShowNuvioModal(false)}
        selectedProviderId={selectedNuvioProvider}
        onSelectProvider={(provId) => {
          setSelectedNuvioProvider(provId);
          setPlayerMode('direct');
          setShowNuvioModal(false);
          setReloadTrigger(prev => prev + 1);
        }}
        onTogglesChanged={() => {
          setReloadTrigger(prev => prev + 1);
        }}
      />

      {/* Android Streaming Guide Modal */}
      {showAndroidGuide && (
        <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Android App & Direct Streaming</h3>
                  <p className="text-xs text-neutral-400">Watch seamlessly via Nuvio Providers on Android</p>
                </div>
              </div>
              <button
                onClick={() => setShowAndroidGuide(false)}
                className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <h4>Direct Streams & Zero-Sandbox Experience</h4>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                With Nuvio Providers integrated directly into Zinovis, video files (MKV, MP4, HLS) are played directly inside the browser using HTML5 Video with zero ads and zero external redirects!
              </p>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setShowAndroidGuide(false)}
                className="px-6 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Back to Player
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
