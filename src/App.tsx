import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
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

// A wrapper to extract params and pass to the actual modal component
import { useParams } from 'react-router-dom';

function MediaDetailRoute() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  return (
    <div className="absolute inset-0 bg-neutral-950 z-50 overflow-y-auto">
      <MediaDetailModal
        mediaId={Number(id)}
        mediaType={(type as MediaType) || 'movie'}
        onClose={() => navigate('/')}
        onPlayMedia={(playId, playType, season, episode) => {
          navigate(`/play/${playType}/${playId}${season ? `/${season}` : ''}${episode ? `/${episode}` : ''}`);
        }}
      />
    </div>
  );
}

function HDPlayerRoute() {
  const { type, id, season, episode } = useParams();
  const navigate = useNavigate();
  return (
    <div className="absolute inset-0 bg-neutral-950 z-50 overflow-hidden">
      <HDPlayerModal
        mediaId={Number(id)}
        mediaType={(type as MediaType) || 'movie'}
        initialSeason={season ? Number(season) : 1}
        initialEpisode={episode ? Number(episode) : 1}
        onClose={() => navigate('/')}
        onPlayMedia={(playId, playType, s, e) => {
          navigate(`/play/${playType}/${playId}${s ? `/${s}` : ''}${e ? `/${e}` : ''}`);
        }}
      />
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

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

  // Handlers for navigating to detail and player views
  const handleOpenMedia = (id: number, type: MediaType) => {
    navigate(`/detail/${type}/${id}`);
  };

  const handlePlayMedia = (id: number, type: MediaType, season = 1, episode = 1) => {
    navigate(`/play/${type}/${id}/${season}/${episode}`);
  };

  const isPlayerOrDetail = location.pathname.startsWith('/play') || location.pathname.startsWith('/detail');

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-red-600 selection:text-white flex flex-col relative">
      
      {/* Top Navbar */}
      {!isPlayerOrDetail && (
        <Navbar
          onOpenFilter={() => setIsFilterOpen(true)}
        />
      )}

      {/* Main Content */}
      {!isPlayerOrDetail && (
        <main className="flex-1">
          <Routes>
            <Route path="/watchlist" element={
              <Watchlist
                onOpenMedia={handleOpenMedia}
                onPlayMedia={handlePlayMedia}
                onExploreMore={() => navigate('/')}
              />
            } />
            
            <Route path="*" element={
              <>
                {/* Hero Banner Carousel */}
                <Routes>
                  <Route path="/movies" element={<HeroBanner items={popularMovies} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />} />
                  <Route path="/tv" element={<HeroBanner items={popularTV} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />} />
                  <Route path="*" element={<HeroBanner items={trending} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />} />
                </Routes>

                {/* Continue Watching Section */}
                <ContinueWatchingRow onPlayMedia={handlePlayMedia} />

                {loading ? (
                  <div className="py-24 text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm font-bold text-neutral-400">Loading High Definition Catalog...</p>
                  </div>
                ) : (
                  <Routes>
                    {/* Home / Trending Views */}
                    <Route path="/" element={
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
                    } />
                    
                    <Route path="/trending" element={
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
                          title="Trending TV Shows"
                          icon={TrendingUp}
                          items={trending.filter((item) => item.media_type === 'tv' || item.first_air_date)}
                          onOpenMedia={handleOpenMedia}
                          onPlayMedia={handlePlayMedia}
                        />
                      </>
                    } />

                    {/* Movies Tab View */}
                    <Route path="/movies" element={
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
                    } />

                    {/* TV Shows Tab View */}
                    <Route path="/tv" element={
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
                    } />
                  </Routes>
                )}
              </>
            } />
          </Routes>
        </main>
      )}

      {/* Footer */}
      {!isPlayerOrDetail && <Footer onNavigateTab={(tab) => navigate(tab === 'home' ? '/' : `/${tab}`)} />}

      {/* Media Detail Modal / Page */}
      <Routes>
        <Route path="/detail/:type/:id" element={<MediaDetailRoute />} />
        <Route path="/play/:type/:id" element={<HDPlayerRoute />} />
        <Route path="/play/:type/:id/:season/:episode" element={<HDPlayerRoute />} />
      </Routes>

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
