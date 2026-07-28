import React, { useState, useEffect } from 'react';
import { 
  X, 
  Play, 
  Plus, 
  Check, 
  Star, 
  Clock, 
  Calendar, 
  Tv, 
  Film, 
  Sparkles, 
  ChevronDown, 
  Volume2, 
  Share2,
  Users
} from 'lucide-react';
import { MediaDetail, MediaType, Season, Episode } from '../types';
import { getMediaDetail, getSeasonDetail, getImageUrl, GENRE_MAP } from '../services/tmdb';
import { isInWatchlist, toggleWatchlist, setPreferredServer } from '../utils/storage';

interface MediaDetailModalProps {
  mediaId: number | null;
  mediaType: MediaType;
  onClose: () => void;
  onPlayMedia: (id: number, type: MediaType, season?: number, episode?: number) => void;
}

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  mediaId,
  mediaType,
  onClose,
  onPlayMedia,
}) => {
  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'episodes' | 'trailers' | 'similar'>('overview');
  
  // TV Series Season & Episode State
  const [selectedSeasonNum, setSelectedSeasonNum] = useState<number>(1);
  const [seasonDetail, setSeasonDetail] = useState<Season | null>(null);
  const [loadingSeason, setLoadingSeason] = useState(false);

  const [inWatchlist, setInWatchlist] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!mediaId) return;

    let isMounted = true;
    setLoading(true);

    getMediaDetail(mediaId, mediaType)
      .then((data) => {
        if (!isMounted) return;
        setDetail(data);
        setInWatchlist(isInWatchlist(data.id, mediaType));

        if (mediaType === 'tv' && data.seasons && data.seasons.length > 0) {
          // Default to season 1 or first available season
          const firstSeason = data.seasons.find(s => s.season_number > 0) || data.seasons[0];
          setSelectedSeasonNum(firstSeason.season_number);
          setActiveTab('episodes');
        } else {
          setActiveTab('overview');
        }
      })
      .catch((err) => console.error('Failed to load media details:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [mediaId, mediaType]);

  // Load Season details when selected season changes
  useEffect(() => {
    if (!mediaId || mediaType !== 'tv') return;

    setLoadingSeason(true);
    getSeasonDetail(mediaId, selectedSeasonNum)
      .then((data) => setSeasonDetail(data))
      .catch((err) => console.error('Failed to load season detail:', err))
      .finally(() => setLoadingSeason(false));
  }, [mediaId, mediaType, selectedSeasonNum]);

  if (!mediaId) return null;

  const handleToggleWatchlist = () => {
    if (!detail) return;
    const title = detail.title || detail.name || 'Untitled';
    const releaseDate = detail.release_date || detail.first_air_date || '';
    const updated = toggleWatchlist({
      id: detail.id,
      media_type: mediaType,
      title,
      poster_path: detail.poster_path,
      backdrop_path: detail.backdrop_path,
      vote_average: detail.vote_average,
      release_date: releaseDate,
    });
    setInWatchlist(updated);
  };

  const handleShare = () => {
    let shareUrl = window.location.href;
    if (shareUrl.includes('ais-dev')) {
      shareUrl = shareUrl.replace('ais-dev', 'ais-pre');
    }
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const title = detail?.title || detail?.name || 'Loading...';
  const releaseDate = detail?.release_date || detail?.first_air_date || '';
  const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
  const runtimeMinutes = detail?.runtime || (detail as any)?.episode_run_time?.[0];

  const trailers = detail?.videos?.results?.filter(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')) || [];
  const cast = detail?.credits?.cast?.slice(0, 10) || [];
  const similar = detail?.recommendations?.results?.slice(0, 8) || detail?.similar?.results?.slice(0, 8) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto bg-neutral-950/90 backdrop-blur-md animate-fadeIn">
      
      {/* Modal Container */}
      <div className="relative w-full max-w-5xl 2xl:max-w-7xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-neutral-950/80 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-red-600 hover:border-red-500 transition-all shadow-lg"
          title="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {loading || !detail ? (
          <div className="p-16 text-center space-y-4 my-auto">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-neutral-400">Loading Zinovis Media Details...</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-neutral-800">
            
            {/* Header Backdrop & Poster Section */}
            <div className="relative aspect-[21/9] min-h-[260px] sm:min-h-[380px] lg:min-h-[500px] 2xl:min-h-[600px] w-full bg-neutral-950 overflow-hidden">
              <img
                src={getImageUrl(detail.backdrop_path || detail.poster_path, 'backdrop')}
                alt={title}
                className="w-full h-full object-cover object-top opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-neutral-900 via-neutral-900/40 to-transparent" />

              {/* Media Quick Info Overlay */}
              <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row items-start sm:items-end gap-6">
                
                {/* Poster Thumbnail */}
                <img
                  src={getImageUrl(detail.poster_path, 'poster')}
                  alt={title}
                  className="w-28 sm:w-40 lg:w-48 2xl:w-56 aspect-[2/3] object-cover rounded-2xl border-2 border-neutral-700 shadow-2xl hidden sm:block flex-shrink-0"
                />

                <div className="space-y-2 flex-1">
                  
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                    <span className="px-2 py-0.5 rounded bg-red-600 text-white uppercase text-[10px]">
                      {mediaType === 'movie' ? 'Movie' : 'TV Series'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px]">
                      HD ULTRA
                    </span>
                    {detail.vote_average > 0 && (
                      <span className="flex items-center gap-1 text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        {detail.vote_average.toFixed(1)} / 10
                      </span>
                    )}
                    <span className="text-neutral-300">• {year}</span>
                    {runtimeMinutes && <span className="text-neutral-400">• {runtimeMinutes} mins</span>}
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl sm:text-4xl lg:text-5xl 2xl:text-6xl font-black text-white tracking-tight">
                    {title}
                  </h2>

                  {/* Tagline */}
                  {detail.tagline && (
                    <p className="text-xs sm:text-sm lg:text-base italic text-red-400/90 font-medium">
                      "{detail.tagline}"
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        onPlayMedia(detail.id, mediaType, selectedSeasonNum, 1);
                      }}
                      className="flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm md:text-base shadow-xl shadow-red-600/40 hover:scale-[1.02] transition-all"
                    >
                      <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                      <span>{mediaType === 'tv' ? 'Watch Season 1 Episode 1' : 'Play Movie in HD'}</span>
                    </button>

                    <button
                      onClick={handleToggleWatchlist}
                      className={`flex items-center gap-2 px-4 py-3 md:px-6 md:py-4 rounded-xl font-bold text-sm md:text-base border transition-all ${
                        inWatchlist
                          ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400'
                          : 'bg-neutral-800/90 border-neutral-700 text-white hover:bg-neutral-700'
                      }`}
                    >
                      {inWatchlist ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : <Plus className="w-4 h-4 md:w-5 md:h-5" />}
                      <span>{inWatchlist ? 'In Watchlist' : 'Watchlist'}</span>
                    </button>

                    <button
                      onClick={handleShare}
                      className="p-3 md:p-4 rounded-xl bg-neutral-800/90 border border-neutral-700 text-neutral-300 hover:text-white transition-all"
                      title="Share Title"
                    >
                      <Share2 className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    {copiedLink && <span className="text-xs md:text-sm text-emerald-400 font-semibold">Link Copied!</span>}
                  </div>

                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="px-6 border-b border-neutral-800 flex items-center gap-2 overflow-x-auto bg-neutral-950/40">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-4 text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'overview'
                    ? 'border-red-500 text-red-400'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                Overview & Cast
              </button>

              {mediaType === 'tv' && (
                <button
                  onClick={() => setActiveTab('episodes')}
                  className={`py-3 px-4 text-sm font-bold border-b-2 transition-all ${
                    activeTab === 'episodes'
                      ? 'border-red-500 text-red-400'
                      : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  Seasons & Episodes
                </button>
              )}

              {trailers.length > 0 && (
                <button
                  onClick={() => setActiveTab('trailers')}
                  className={`py-3 px-4 text-sm font-bold border-b-2 transition-all ${
                    activeTab === 'trailers'
                      ? 'border-red-500 text-red-400'
                      : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  Trailers ({trailers.length})
                </button>
              )}

              {similar.length > 0 && (
                <button
                  onClick={() => setActiveTab('similar')}
                  className={`py-3 px-4 text-sm font-bold border-b-2 transition-all ${
                    activeTab === 'similar'
                      ? 'border-red-500 text-red-400'
                      : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  Recommendations
                </button>
              )}
            </div>

            {/* Tab Contents */}
            <div className="p-6 space-y-6">

              {/* Tab 1: Overview & Cast */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  
                  {/* Overview Text */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">Storyline</h3>
                    <p className="text-sm text-neutral-300 leading-relaxed">
                      {detail.overview || 'No storyline overview available for this title.'}
                    </p>
                  </div>

                  {/* Genres */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Genres</h3>
                    <div className="flex flex-wrap gap-2">
                      {detail.genres?.map((g) => (
                        <span key={g.id} className="px-3 py-1 rounded-xl bg-neutral-800 border border-neutral-700 text-xs font-semibold text-neutral-200">
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Top Cast Carousel */}
                  {cast.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <Users className="w-5 h-5 text-red-500" />
                          Top Cast
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {cast.map((actor) => (
                          <div key={actor.id} className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-2.5 flex items-center gap-3">
                            <img
                              src={getImageUrl(actor.profile_path, 'avatar')}
                              alt={actor.name}
                              className="w-11 h-11 object-cover rounded-full bg-neutral-800 flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white truncate">{actor.name}</h4>
                              <p className="text-[10px] text-neutral-400 truncate">{actor.character}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Tab 2: Seasons & Episodes (TV Shows) */}
              {activeTab === 'episodes' && mediaType === 'tv' && (
                <div className="space-y-6">
                  
                  {/* Season Selector Dropdown */}
                  <div className="flex items-center justify-between bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-white">Select Season</h3>
                      <p className="text-xs text-neutral-400">Total {detail.seasons?.length || 1} Seasons available in HD</p>
                    </div>

                    <select
                      value={selectedSeasonNum}
                      onChange={(e) => setSelectedSeasonNum(Number(e.target.value))}
                      className="bg-neutral-900 border border-neutral-700 text-white font-bold text-sm px-4 py-2 rounded-xl focus:outline-none focus:border-red-500"
                    >
                      {detail.seasons?.filter(s => s.season_number > 0).map((s) => (
                        <option key={s.id} value={s.season_number}>
                          {s.name || `Season ${s.season_number}`} ({s.episode_count} Episodes)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Episode Guide List */}
                  {loadingSeason ? (
                    <div className="p-8 text-center text-sm text-neutral-400 animate-pulse">
                      Loading Season {selectedSeasonNum} Episodes...
                    </div>
                  ) : seasonDetail?.episodes && seasonDetail.episodes.length > 0 ? (
                    <div className="space-y-3">
                      {seasonDetail.episodes.map((ep) => (
                        <div
                          key={ep.id}
                          className="group bg-neutral-950 border border-neutral-800/80 hover:border-neutral-700 p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all"
                        >
                          {/* Episode Still Image */}
                          <div className="relative aspect-video w-full sm:w-44 bg-neutral-900 rounded-xl overflow-hidden flex-shrink-0">
                            <img
                              src={getImageUrl(ep.still_path || detail.backdrop_path, 'backdrop')}
                              alt={ep.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <button
                              onClick={() => onPlayMedia(detail.id, 'tv', selectedSeasonNum, ep.episode_number)}
                              className="absolute inset-0 bg-neutral-950/40 group-hover:bg-neutral-950/20 flex items-center justify-center text-white"
                            >
                              <div className="p-2.5 rounded-full bg-red-600 text-white shadow-lg">
                                <Play className="w-4 h-4 fill-current translate-x-0.5" />
                              </div>
                            </button>
                            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-neutral-950/90 text-[10px] font-bold text-white">
                              EP {ep.episode_number}
                            </span>
                          </div>

                          {/* Episode Details */}
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                                {ep.episode_number}. {ep.name}
                              </h4>
                              {ep.runtime && (
                                <span className="text-xs text-neutral-400 font-medium">
                                  {ep.runtime} min
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                              {ep.overview || 'No episode overview available.'}
                            </p>
                          </div>

                          {/* Play Action */}
                          <button
                            onClick={() => onPlayMedia(detail.id, 'tv', selectedSeasonNum, ep.episode_number)}
                            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Play Ep {ep.episode_number}</span>
                          </button>

                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-neutral-400 text-sm">
                      No episode details available for Season {selectedSeasonNum}.
                    </div>
                  )}

                </div>
              )}

              {/* Tab 3: Official Trailers */}
              {activeTab === 'trailers' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {trailers.map((vid) => (
                    <div key={vid.id} className="space-y-2">
                      <div className="aspect-video w-full rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800 shadow">
                        <iframe
                          src={`https://www.youtube.com/embed/${vid.key}`}
                          title={vid.name}
                          className="w-full h-full border-0"
                          allowFullScreen
                          allow="autoplay; encrypted-media; picture-in-picture; accelerometer; gyroscope; clipboard-write"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <p className="text-xs font-bold text-neutral-300 truncate">{vid.name}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 4: Similar & Recommended */}
              {activeTab === 'similar' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {similar.map((item) => {
                    const itemType = item.media_type || mediaType;
                    const itemTitle = item.title || item.name || 'Untitled';
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          onClose();
                          setTimeout(() => onPlayMedia(item.id, itemType), 100);
                        }}
                        className="group relative aspect-[2/3] rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800 hover:border-red-500 cursor-pointer shadow transition-all"
                      >
                        <img
                          src={getImageUrl(item.poster_path, 'poster')}
                          alt={itemTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent p-3 flex flex-col justify-end">
                          <h4 className="text-xs font-bold text-white truncate">{itemTitle}</h4>
                          <span className="text-[10px] text-amber-400 font-bold">★ {item.vote_average?.toFixed(1) || '7.5'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          </div>
        )}

      </div>
    </div>
  );
};
