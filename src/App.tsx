import React, { useState, useEffect } from 'react';
import { 
  Film, 
  Tv, 
  TrendingUp, 
  Star, 
  Flame, 
  Sparkles, 
  Popcorn, 
  Clapperboard, 
  Ghost, 
  Rocket 
} from 'lucide-react';
import { MediaItem, MediaType } from './types';
import { 
  getTrending, 
  getPopularMovies, 
  getPopularTV, 
  getTopRatedMovies, 
  getNowPlayingMovies, 
  discoverMedia 
} from './services/tmdb';

import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { MediaRow } from './components/MediaRow';
import { ContinueWatchingRow } from './components/ContinueWatchingRow';
import { Watchlist } from './components/Watchlist';
import { MediaDetailModal } from './components/MediaDetailModal';
import { HDPlayerModal } from './components/HDPlayerModal';
import { ExploreFilter } from './components/ExploreFilter';
import { Footer } from './components/Footer';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('home');

  // Catalog Data States
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<MediaItem[]>([]);
  const [popularTV, setPopularTV] = useState<MediaItem[]>([]);
  const [topRated, setTopRated] = useState<MediaItem[]>([]);
  const [nowPlaying, setNowPlaying] = useState<MediaItem[]>([]);
  
  // Category Genres
  const [actionMedia, setActionMedia] = useState<MediaItem[]>([]);
  const [sciFiMedia, setSciFiMedia] = useState<MediaItem[]>([]);
  const [horrorMedia, setHorrorMedia] = useState<MediaItem[]>([]);
  const [animationMedia, setAnimationMedia] = useState<MediaItem[]>([]);

  const [loading, setLoading] = useState(true);

  // Modals
  const [detailMediaId, setDetailMediaId] = useState<number | null>(null);
  const [detailMediaType, setDetailMediaType] = useState<MediaType>('movie');

  const [playerMediaId, setPlayerMediaId] = useState<number | null>(null);
  const [playerMediaType, setPlayerMediaType] = useState<MediaType>('movie');
  const [playerSeason, setPlayerSeason] = useState<number>(1);
  const [playerEpisode, setPlayerEpisode] = useState<number>(1);

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Fetch initial catalog data from TMDB
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      getTrending('all', 'week'),
      getPopularMovies(),
      getPopularTV(),
      getTopRatedMovies(),
      getNowPlayingMovies(),
      discoverMedia('movie', { genreId: 28 }), // Action
      discoverMedia('movie', { genreId: 878 }), // Sci-Fi
      discoverMedia('movie', { genreId: 27 }), // Horror
      discoverMedia('movie', { genreId: 16 }), // Animation
    ])
      .then(([
        trendingRes,
        popularMoviesRes,
        popularTVRes,
        topRatedRes,
        nowPlayingRes,
        actionRes,
        sciFiRes,
        horrorRes,
        animationRes,
      ]) => {
        if (!isMounted) return;
        setTrending(trendingRes);
        setPopularMovies(popularMoviesRes);
        setPopularTV(popularTVRes);
        setTopRated(topRatedRes);
        setNowPlaying(nowPlayingRes);
        setActionMedia(actionRes.results);
        setSciFiMedia(sciFiRes.results);
        setHorrorMedia(horrorRes.results);
        setAnimationMedia(animationRes.results);
      })
      .catch((err) => console.error('Failed to load Cinescope catalog:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Handlers for opening detail and player modals
  const handleOpenMedia = (id: number, type: MediaType) => {
    setDetailMediaId(id);
    setDetailMediaType(type);
  };

  const handlePlayMedia = (id: number, type: MediaType, season = 1, episode = 1) => {
    setPlayerMediaId(id);
    setPlayerMediaType(type);
    setPlayerSeason(season);
    setPlayerEpisode(episode);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-red-600 selection:text-white flex flex-col">
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenMedia={handleOpenMedia}
        onPlayMedia={handlePlayMedia}
        onOpenFilter={() => setIsFilterOpen(true)}
      />

      {/* Main Tab Content */}
      {activeTab === 'watchlist' ? (
        <Watchlist
          onOpenMedia={handleOpenMedia}
          onPlayMedia={handlePlayMedia}
          onExploreMore={() => setActiveTab('home')}
        />
      ) : (
        <main className="flex-1">
          
          {/* Hero Banner Carousel on Home / Movies / TV */}
          <HeroBanner
            items={
              activeTab === 'movies'
                ? popularMovies
                : activeTab === 'tv'
                ? popularTV
                : trending
            }
            onOpenMedia={handleOpenMedia}
            onPlayMedia={handlePlayMedia}
          />

          {/* Continue Watching Section */}
          <ContinueWatchingRow onPlayMedia={handlePlayMedia} />

          {loading ? (
            <div className="py-24 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-bold text-neutral-400">Loading High Definition Catalog...</p>
            </div>
          ) : (
            <>
              {/* Home / Trending Views */}
              {(activeTab === 'home' || activeTab === 'trending') && (
                <>
                  <MediaRow
                    title="Trending This Week"
                    subtitle="Most watched movies and series right now"
                    icon={TrendingUp}
                    items={trending}
                    onOpenMedia={handleOpenMedia}
                    onPlayMedia={handlePlayMedia}
                  />

                  <MediaRow
                    title="Top Rated Masterpieces"
                    subtitle="Critically acclaimed cinema classics"
                    icon={Star}
                    items={topRated}
                    onOpenMedia={handleOpenMedia}
                    onPlayMedia={handlePlayMedia}
                  />

                  <MediaRow
                    title="Popular Movies"
                    subtitle="Blockbuster movies in 1080p Ultra HD"
                    icon={Film}
                    items={popularMovies}
                    onOpenMedia={handleOpenMedia}
                    onPlayMedia={handlePlayMedia}
                  />

                  <MediaRow
                    title="Popular TV Series"
                    subtitle="Binge-worthy shows with full season episodes"
                    icon={Tv}
                    items={popularTV}
                    onOpenMedia={handleOpenMedia}
                    onPlayMedia={handlePlayMedia}
                  />
                </>
              )}

              {/* Movies Tab View */}
              {activeTab === 'movies' && (
                <>
                  <MediaRow
                    title="Popular Movies"
                    icon={Film}
                    items={popularMovies}
                    onOpenMedia={handleOpenMedia}
                    onPlayMedia={handlePlayMedia}
                  />

                  <MediaRow
                    title="Now Playing in Theaters"
                    icon={Popcorn}
                    items={nowPlaying}
                    onOpenMedia={handleOpenMedia}
                    onPlayMedia={handlePlayMedia}
                  />

                  <MediaRow
                    title="Action & Adventure"
                    icon={Flame}
                    items={actionMedia}
                    onOpenMedia={handleOpenMedia}
                    onPlayMedia={handlePlayMedia}
                  />

                  <MediaRow
                    title="Sci-Fi & Fantasy"
                    icon={Rocket}
                    items={sciFiMedia}
                    onOpenMedia={handleOpenMedia}
                    onPlayMedia={handlePlayMedia}
                  />

                  <MediaRow
                    title="Horror & Thrillers"
                    icon={Ghost}
                    items={horrorMedia}
                    onOpenMedia={handleOpenMedia}
                    onPlayMedia={handlePlayMedia}
                  />
                </>
              )}

              {/* TV Shows Tab View */}
              {activeTab === 'tv' && (
                <>
                  <MediaRow
                    title="Top TV Series"
                    icon={Tv}
                    items={popularTV}
                    onOpenMedia={handleOpenMedia}
                    onPlayMedia={handlePlayMedia}
                  />

                  <MediaRow
                    title="Trending TV Shows"
                    icon={TrendingUp}
                    items={trending.filter((item) => item.media_type === 'tv' || item.first_air_date)}
                    onOpenMedia={handleOpenMedia}
                    onPlayMedia={handlePlayMedia}
                  />

                  <MediaRow
                    title="Animation & Anime Series"
                    icon={Sparkles}
                    items={animationMedia}
                    onOpenMedia={handleOpenMedia}
                    onPlayMedia={handlePlayMedia}
                  />
                </>
              )}
            </>
          )}

        </main>
      )}

      {/* Footer */}
      <Footer onNavigateTab={setActiveTab} />

      {/* Media Detail Modal */}
      {detailMediaId && (
        <MediaDetailModal
          mediaId={detailMediaId}
          mediaType={detailMediaType}
          onClose={() => setDetailMediaId(null)}
          onPlayMedia={(id, type, s, e) => {
            setDetailMediaId(null);
            handlePlayMedia(id, type, s, e);
          }}
        />
      )}

      {/* HD Video Streaming Player Modal */}
      {playerMediaId && (
        <HDPlayerModal
          mediaId={playerMediaId}
          mediaType={playerMediaType}
          initialSeason={playerSeason}
          initialEpisode={playerEpisode}
          onClose={() => setPlayerMediaId(null)}
        />
      )}

      {/* Filter Side Drawer */}
      <ExploreFilter
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onOpenMedia={handleOpenMedia}
        onPlayMedia={handlePlayMedia}
      />

    </div>
  );
}
