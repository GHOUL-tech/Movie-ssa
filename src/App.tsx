import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Rocket,
  ShieldCheck,
  Headphones
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
import { ProfilePage } from './components/ProfilePage';
import { MediaDetailModal } from './components/MediaDetailModal';
import { HDPlayerModal } from './components/HDPlayerModal';
import { ExploreFilter } from './components/ExploreFilter';
import { Footer } from './components/Footer';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { AdminPanel } from './components/AdminPanel';
import { AdminLoginModal } from './components/AdminLoginModal';
import { LiveSupportModal } from './components/LiveSupportModal';

import { useParams } from 'react-router-dom';

function MediaDetailRoute() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  return (
    <MediaDetailModal
      mediaId={Number(id)}
      mediaType={(type as MediaType) || 'movie'}
      onClose={() => navigate('/')}
      onPlayMedia={(playId, playType, season, episode) => {
        navigate(`/play/${playType}/${playId}${season ? `/${season}` : ''}${episode ? `/${episode}` : ''}`);
      }}
    />
  );
}

function HDPlayerRoute() {
  const { type, id, season, episode } = useParams();
  const navigate = useNavigate();
  return (
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
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const { 
    isUnder18, 
    currentUser, 
    isAdminModalOpen, 
    closeAdminModal, 
    isSupportModalOpen, 
    closeSupportModal, 
    openSupportModal 
  } = useAuth();

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
      .catch((err) => console.error('Failed to load Zinovis catalog:', err))
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

  // Safe Mode: filter out adult / 18+ content when isUnder18 is true
  const safeTrending = useMemo(() => isUnder18 ? trending.filter(item => !item.adult) : trending, [trending, isUnder18]);
  const safePopularMovies = useMemo(() => isUnder18 ? popularMovies.filter(item => !item.adult) : popularMovies, [popularMovies, isUnder18]);
  const safePopularTV = useMemo(() => isUnder18 ? popularTV.filter(item => !item.adult) : popularTV, [popularTV, isUnder18]);
  const safeTopRated = useMemo(() => isUnder18 ? topRated.filter(item => !item.adult) : topRated, [topRated, isUnder18]);
  const safeNowPlaying = useMemo(() => isUnder18 ? nowPlaying.filter(item => !item.adult) : nowPlaying, [nowPlaying, isUnder18]);
  const safeActionMedia = useMemo(() => isUnder18 ? actionMedia.filter(item => !item.adult) : actionMedia, [actionMedia, isUnder18]);
  const safeSciFiMedia = useMemo(() => isUnder18 ? sciFiMedia.filter(item => !item.adult) : sciFiMedia, [sciFiMedia, isUnder18]);
  const safeHorrorMedia = useMemo(() => isUnder18 ? [] : horrorMedia.filter(item => !item.adult), [horrorMedia, isUnder18]);
  const safeAnimationMedia = useMemo(() => isUnder18 ? animationMedia.filter(item => !item.adult) : animationMedia, [animationMedia, isUnder18]);

  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-red-600 selection:text-white flex flex-col relative w-full max-w-full overflow-x-hidden">
      
      {/* Navbar (hidden on /admin to provide full screen dashboard) */}
      {!isAdminRoute && (
        <Navbar
          onOpenFilter={() => setIsFilterOpen(true)}
        />
      )}

      {/* Under 18 Safe Mode Notice Banner */}
      {isUnder18 && !isAdminRoute && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-300 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            <strong>Safe Mode Activated (Age {currentUser?.age || '<18'}):</strong> All 18+ adult titles and mature horror have been filtered down from your streaming feed.
          </span>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        <Routes>
          {/* Admin Panel Route */}
          <Route path="/admin" element={<AdminPanel />} />

          <Route path="/profile" element={
            <ProfilePage
              onOpenMedia={handleOpenMedia}
              onPlayMedia={handlePlayMedia}
              onExploreMore={() => navigate('/')}
            />
          } />

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
              <Route path="/movies" element={<HeroBanner items={safePopularMovies} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />} />
              <Route path="/tv" element={<HeroBanner items={safePopularTV} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />} />
              <Route path="*" element={<HeroBanner items={safeTrending} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />} />
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
                    <MediaRow title="Trending This Week" subtitle="Most watched movies and series right now" icon={TrendingUp} items={safeTrending} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />
                    <MediaRow title="Top Rated Masterpieces" subtitle="Critically acclaimed cinema classics" icon={Star} items={safeTopRated} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />
                    <MediaRow title="Popular Movies" subtitle="Blockbuster movies in 1080p Ultra HD" icon={Film} items={safePopularMovies} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />
                    <MediaRow title="Popular TV Series" subtitle="Binge-worthy shows with full season episodes" icon={Tv} items={safePopularTV} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />
                  </>
                } />

                <Route path="/detail/*" element={
                  <>
                    <MediaRow title="Trending This Week" subtitle="Most watched movies and series right now" icon={TrendingUp} items={safeTrending} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />
                    <MediaRow title="Top Rated Masterpieces" subtitle="Critically acclaimed cinema classics" icon={Star} items={safeTopRated} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />
                    <MediaRow title="Popular Movies" subtitle="Blockbuster movies in 1080p Ultra HD" icon={Film} items={safePopularMovies} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />
                    <MediaRow title="Popular TV Series" subtitle="Binge-worthy shows with full season episodes" icon={Tv} items={safePopularTV} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />
                  </>
                } />
                
                <Route path="/play/*" element={
                  <>
                    <MediaRow title="Trending This Week" subtitle="Most watched movies and series right now" icon={TrendingUp} items={safeTrending} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />
                    <MediaRow title="Top Rated Masterpieces" subtitle="Critically acclaimed cinema classics" icon={Star} items={safeTopRated} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />
                    <MediaRow title="Popular Movies" subtitle="Blockbuster movies in 1080p Ultra HD" icon={Film} items={safePopularMovies} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />
                    <MediaRow title="Popular TV Series" subtitle="Binge-worthy shows with full season episodes" icon={Tv} items={safePopularTV} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />
                  </>
                } />
                
                <Route path="/trending" element={
                  <>
                    <MediaRow title="Trending This Week" subtitle="Most watched movies and series right now" icon={TrendingUp} items={safeTrending} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />
                    <MediaRow title="Trending TV Shows" icon={TrendingUp} items={safeTrending.filter((item) => item.media_type === 'tv' || item.first_air_date)} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />
                  </>
                } />

                {/* Movies Tab View */}
                <Route path="/movies" element={
                  <>
                    <MediaRow title="Popular Movies" icon={Film} items={safePopularMovies} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />
                    <MediaRow title="Now Playing in Theaters" icon={Popcorn} items={safeNowPlaying} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />
                    <MediaRow title="Action &amp; Adventure" icon={Flame} items={safeActionMedia} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />
                    <MediaRow title="Sci-Fi &amp; Fantasy" icon={Rocket} items={safeSciFiMedia} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />
                    {!isUnder18 && (
                      <MediaRow title="Horror &amp; Thrillers" icon={Ghost} items={safeHorrorMedia} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />
                    )}
                  </>
                } />

                {/* TV Shows Tab View */}
                <Route path="/tv" element={
                  <>
                    <MediaRow title="Top TV Series" icon={Tv} items={safePopularTV} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />
                    <MediaRow title="Trending TV Shows" icon={TrendingUp} items={safeTrending.filter((item) => item.media_type === 'tv' || item.first_air_date)} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />
                    <MediaRow title="Animation &amp; Anime Series" icon={Sparkles} items={safeAnimationMedia} onOpenMedia={handleOpenMedia} onPlayMedia={handlePlayMedia} />
                  </>
                } />
              </Routes>
            )}
          </>
        } />
      </Routes>
    </main>

    {/* Footer (hidden on admin page) */}
    {!isAdminRoute && (
      <Footer onNavigateTab={(tab) => navigate(tab === 'home' ? '/' : `/${tab}`)} />
    )}

    {/* Floating Live Support Badge in Bottom Corner */}
    {!isAdminRoute && (
      <button
        onClick={openSupportModal}
        className="fixed bottom-5 right-5 z-40 p-3 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 text-white shadow-2xl shadow-red-600/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group cursor-pointer border border-red-400/40"
        title="Live Support Chat"
      >
        <Headphones className="w-5 h-5 text-white" />
        <span className="text-xs font-bold hidden sm:inline pr-1">Support</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
      </button>
    )}

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

    {/* Global Auth Modal */}
    <AuthModal />

    {/* Admin Login Modal (Triggered by Love Emoji ❤️) */}
    <AdminLoginModal
      isOpen={isAdminModalOpen}
      onClose={closeAdminModal}
      onSuccess={() => navigate('/admin')}
    />

    {/* User Live Support Modal */}
    <LiveSupportModal
      isOpen={isSupportModalOpen}
      onClose={closeSupportModal}
    />
  </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
