import { NuvioRepository, NuvioScraper, NuvioStream, MediaDetail } from '../types';
import { 
  isRepositoryEnabled, 
  isProviderEnabled, 
  getEnabledRepositories, 
  getEnabledProviders 
} from '../utils/storage';

export interface AudioTrackOption {
  id: string;
  name: string;
  nativeName?: string;
  badge: string;
  isDub: boolean;
  recommendedProvider?: string;
  flag?: string;
  note?: string;
}

// 6 Official Nuvio Provider Repositories
export const DEFAULT_NUVIO_REPOSITORIES: NuvioRepository[] = [
  {
    id: 'yoruix',
    name: "Yoru's Repo",
    url: 'https://raw.githubusercontent.com/yoruix/nuvio-providers/refs/heads/main/manifest.json',
    baseUrl: 'https://raw.githubusercontent.com/yoruix/nuvio-providers/refs/heads/main/',
    version: '1.0.0',
    author: 'yoruix',
    description: 'High performance providers (4KHDHub, StreamFlix, UHDMovies, MoviesMod, AnimePahe)',
    scrapersCount: 29,
    status: 'ready'
  },
  {
    id: 'phisher98',
    name: "Phisher's Repo",
    url: 'https://raw.githubusercontent.com/phisher98/phisher-nuvio-providers/refs/heads/main/manifest.json',
    baseUrl: 'https://raw.githubusercontent.com/phisher98/phisher-nuvio-providers/refs/heads/main/',
    version: '1.0.0',
    author: 'phisher98',
    description: 'Massive library with 50+ scrapers (MoviesDrive, AllWish, Anime-dekho, Anichi)',
    scrapersCount: 51,
    status: 'ready'
  },
  {
    id: 'allinone',
    name: 'All-in-One-Nuvio',
    url: 'https://raw.githubusercontent.com/D3adlyRocket/All-in-One-Nuvio/refs/heads/main/manifest.json',
    baseUrl: 'https://raw.githubusercontent.com/D3adlyRocket/All-in-One-Nuvio/refs/heads/main/',
    version: '1.0.0',
    author: 'D3adlyRocket',
    description: 'Comprehensive multi-region & anime collection (AllAnime, 4KHDHub, 1Shows, AnimeKai)',
    scrapersCount: 65,
    status: 'ready'
  },
  {
    id: 'spidey',
    name: "Spidey's Providers",
    url: 'https://raw.githubusercontent.com/Abinanthankv/NuvioRepo/refs/heads/master/manifest.json',
    baseUrl: 'https://raw.githubusercontent.com/Abinanthankv/NuvioRepo/refs/heads/master/',
    version: '1.0.0',
    author: 'Abinanthankv',
    description: 'South Asian & Indian cinema providers (TamilMV, Tamilblasters, Tamilian, Moviesda)',
    scrapersCount: 10,
    status: 'ready'
  },
  {
    id: 'michat88',
    name: 'Michat88 Repo',
    url: 'https://raw.githubusercontent.com/michat88/nuvio-providers/refs/heads/main/manifest.json',
    baseUrl: 'https://raw.githubusercontent.com/michat88/nuvio-providers/refs/heads/main/',
    version: '1.0.0',
    author: 'michat88',
    description: 'Asian Drama & Anime streaming (Kisskh, 4khdhub, Animekai, Castle, Cinevibe)',
    scrapersCount: 30,
    status: 'ready'
  },
  {
    id: 'ray',
    name: "Ray's Plugins",
    url: 'https://raw.githubusercontent.com/hihihihihiiray/plugins/refs/heads/main/manifest.json',
    baseUrl: 'https://raw.githubusercontent.com/hihihihihiiray/plugins/refs/heads/main/',
    version: '1.0',
    author: 'hihihihihiiray',
    description: 'Fast streaming scrapers (~4s) with direct 4K (Airflix, 4KHDHub, BollyFlix, Embed69)',
    scrapersCount: 18,
    status: 'ready'
  }
];

/**
 * Fetch all 6 registered Nuvio repositories with active on/off status
 */
export async function fetchNuvioRepositories(): Promise<NuvioRepository[]> {
  try {
    const res = await fetch('/api/nuvio/repositories');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.repositories)) {
        return data.repositories.map((repo: NuvioRepository) => ({
          ...repo,
          enabled: isRepositoryEnabled(repo.id)
        }));
      }
    }
  } catch (err) {
    console.warn('[NuvioService] Failed to fetch repositories from API, using defaults:', err);
  }
  return DEFAULT_NUVIO_REPOSITORIES.map((repo) => ({
    ...repo,
    enabled: isRepositoryEnabled(repo.id)
  }));
}

/**
 * Fetch all scrapers across all repositories with active on/off status
 */
export async function fetchNuvioProviders(options?: {
  repoId?: string;
  type?: string;
  language?: string;
  search?: string;
}): Promise<NuvioScraper[]> {
  const params = new URLSearchParams();
  if (options?.repoId) params.append('repoId', options.repoId);
  if (options?.type) params.append('type', options.type);
  if (options?.language) params.append('language', options.language);
  if (options?.search) params.append('search', options.search);

  try {
    const res = await fetch(`/api/nuvio/providers?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.providers)) {
        return data.providers.map((p: NuvioScraper) => ({
          ...p,
          enabled: isProviderEnabled(p.id, p.repoId)
        }));
      }
    }
  } catch (err) {
    console.warn('[NuvioService] Failed to fetch providers from API:', err);
  }
  return [];
}

/**
 * Fetch live video streams for a specific movie or TV show using active Nuvio Provider Scrapers
 */
export async function fetchNuvioStreams(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  season = 1,
  episode = 1,
  providerId = 'auto'
): Promise<NuvioStream[]> {
  // Collect disabled repositories and providers
  const repoMap = getEnabledRepositories();
  const providerMap = getEnabledProviders();

  const disabledRepos = Object.entries(repoMap)
    .filter(([_, enabled]) => enabled === false)
    .map(([id]) => id);

  const disabledProviders = Object.entries(providerMap)
    .filter(([_, enabled]) => enabled === false)
    .map(([id]) => id);

  // If a specific provider was selected and it is disabled, return empty
  if (providerId !== 'auto' && !isProviderEnabled(providerId)) {
    return [];
  }

  const params = new URLSearchParams({
    tmdbId: tmdbId.toString(),
    mediaType,
    season: season.toString(),
    episode: episode.toString(),
    providerId
  });

  if (disabledRepos.length > 0) {
    params.append('disabledRepos', disabledRepos.join(','));
  }
  if (disabledProviders.length > 0) {
    params.append('disabledProviders', disabledProviders.join(','));
  }

  try {
    const res = await fetch(`/api/nuvio/streams?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.streams) && data.streams.length > 0) {
        return data.streams;
      }
    }
  } catch (err) {
    console.warn('[NuvioService] Failed to fetch streams from backend API:', err);
  }

  // Client-Side Emergency Fallback Streams for static hostings (Vercel, Netlify, offline)
  const clientFallbacks: NuvioStream[] = [
    {
      id: `client-vidlink-${tmdbId}`,
      name: 'Nuvio Ultra Stream (1080p Multi-Audio)',
      title: `${mediaType === 'tv' ? `S${season} E${episode} - ` : ''}Nuvio Ultra Stream (1080p Multi-Audio)`,
      url: mediaType === 'movie'
        ? `https://vidlink.pro/movie/${tmdbId}?primaryColor=e50914&secondaryColor=ffffff`
        : `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?primaryColor=e50914&secondaryColor=ffffff`,
      quality: '1080p',
      size: 'Direct HD',
      providerId: 'vidlink',
      providerName: 'VidLink Pro',
      repoName: "Yoru's Repo",
      format: 'embed',
      isDirect: true
    },
    {
      id: `client-multiserver-${tmdbId}`,
      name: 'Nuvio Multi-Server (Auto-Failover)',
      title: `${mediaType === 'tv' ? `S${season} E${episode} - ` : ''}Nuvio Multi-Server Stream`,
      url: mediaType === 'movie'
        ? `https://vidsrcme.ru/embed/movie?tmdb=${tmdbId}`
        : `https://vidsrcme.ru/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,
      quality: '1080p',
      size: 'Clean Buffer',
      providerId: 'nuvio-multiserver',
      providerName: 'Nuvio Edge',
      repoName: 'All-in-One-Nuvio',
      format: 'embed',
      isDirect: true
    },
    {
      id: `client-vidsrc-${tmdbId}`,
      name: 'Nuvio Vidsrc Pro (1080p HD)',
      title: `${mediaType === 'tv' ? `S${season} E${episode} - ` : ''}Nuvio Vidsrc Pro HD`,
      url: mediaType === 'movie'
        ? `https://vidsrc.to/embed/movie/${tmdbId}`
        : `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`,
      quality: '1080p',
      size: 'Multi-Dub',
      providerId: 'nuvio-vidsrc',
      providerName: 'Nuvio Vidsrc',
      repoName: "Phisher's Repo",
      format: 'embed',
      isDirect: true
    },
    {
      id: `client-autoembed-${tmdbId}`,
      name: 'Nuvio AutoEmbed Fast (1080p)',
      title: `${mediaType === 'tv' ? `S${season} E${episode} - ` : ''}Nuvio AutoEmbed Fast`,
      url: mediaType === 'movie'
        ? `https://autoembed.co/movie/tmdb/${tmdbId}`
        : `https://autoembed.co/tv/tmdb/${tmdbId}/${season}/${episode}`,
      quality: '1080p',
      size: 'Instant Load',
      providerId: 'nuvio-autoembed',
      providerName: 'Nuvio AutoEmbed',
      repoName: 'All-in-One-Nuvio',
      format: 'embed',
      isDirect: true
    }
  ];

  return clientFallbacks;
}

/**
 * Build a proxy URL for direct video playback in HTML5 video elements
 */
export function getProxiedStreamUrl(originalUrl: string, referer?: string): string {
  if (!originalUrl) return '';
  const params = new URLSearchParams({ url: originalUrl });
  if (referer) {
    params.append('referer', referer);
  }
  return `/api/nuvio/proxy-stream?${params.toString()}`;
}

/**
 * Detect regional and multi-language dub options from media metadata & provider support
 */
export function detectRegionalAndDubOptions(detail: MediaDetail | null): AudioTrackOption[] {
  const options: AudioTrackOption[] = [
    {
      id: 'original',
      name: 'Original Audio (HD / Atmos)',
      badge: 'Original HD',
      isDub: false,
      flag: '🌐',
      note: 'Source master audio in highest fidelity'
    }
  ];

  if (!detail) return options;

  const originalLang = (detail.origin_country || []).join(', ').toLowerCase();
  const spoken = (detail.spoken_languages || []).map((l) => l.name.toLowerCase()).join(' ');
  const translations = (detail.translations?.translations || []).map((t) => t.name.toLowerCase()).join(' ');

  // English Dub
  if (originalLang !== 'us' && originalLang !== 'gb' && !spoken.includes('english')) {
    options.push({
      id: 'english',
      name: 'English Dub (Official Audio)',
      badge: 'English Dub',
      isDub: true,
      recommendedProvider: 'airflix',
      flag: '🇺🇸',
      note: 'English dubbed audio track available'
    });
  }

  // Hindi Dub
  options.push({
    id: 'hindi',
    name: 'Hindi Dubbed (Dual Audio)',
    badge: 'Hindi Dub',
    isDub: true,
    recommendedProvider: '4khdhub',
    flag: '🇮🇳',
    note: 'Dual audio track (Hindi + English) via 4KHDHub & BollyFlix'
  });

  // Tamil / South Asian Audio
  options.push({
    id: 'tamil',
    name: 'Tamil / South Asian Audio',
    badge: 'Tamil Dub',
    isDub: true,
    recommendedProvider: 'tamilmv',
    flag: '🇮🇳',
    note: 'Tamil & regional audio via Spidey TamilMV / Tamilblasters'
  });

  // Japanese / Anime Audio
  if (spoken.includes('japan') || translations.includes('japan') || (detail.genres || []).some(g => g.name.toLowerCase().includes('animation'))) {
    options.push({
      id: 'japanese',
      name: 'Japanese (Original Voice + Sub)',
      badge: 'Anime Native',
      isDub: false,
      recommendedProvider: 'allanime',
      flag: '🇯🇵',
      note: 'Native Japanese voice with synced subtitles via AllAnime & AnimePahe'
    });
  }

  // Spanish Dub
  options.push({
    id: 'spanish',
    name: 'Spanish / Castellano & Latino',
    badge: 'Español Dub',
    isDub: true,
    recommendedProvider: 'embed69',
    flag: '🇪🇸',
    note: 'Spanish audio streams via Embed69 & Global providers'
  });

  return options;
}
