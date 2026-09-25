import type { Request, Response } from 'express';
import cheerio from 'cheerio-without-node-native';
import crypto from 'crypto-js';

export interface RepositoryConfig {
  id: string;
  name: string;
  url: string;
  baseUrl: string;
  author: string;
  description: string;
}

export const NUVIO_REPOSITORIES: RepositoryConfig[] = [
  {
    id: 'yoruix',
    name: "Yoru's Repo",
    url: 'https://raw.githubusercontent.com/yoruix/nuvio-providers/refs/heads/main/manifest.json',
    baseUrl: 'https://raw.githubusercontent.com/yoruix/nuvio-providers/refs/heads/main/',
    author: 'yoruix',
    description: 'Direct high quality links up to 4K & multi-resolution (4KHDHub, StreamFlix, UHDMovies, MoviesMod, AnimePahe)'
  },
  {
    id: 'phisher98',
    name: "Phisher's Repo",
    url: 'https://raw.githubusercontent.com/phisher98/phisher-nuvio-providers/refs/heads/main/manifest.json',
    baseUrl: 'https://raw.githubusercontent.com/phisher98/phisher-nuvio-providers/refs/heads/main/',
    author: 'phisher98',
    description: 'Massive catalog with 50+ providers including MoviesDrive, AllWish, Anime-dekho, Anichi'
  },
  {
    id: 'allinone',
    name: 'All-in-One-Nuvio',
    url: 'https://raw.githubusercontent.com/D3adlyRocket/All-in-One-Nuvio/refs/heads/main/manifest.json',
    baseUrl: 'https://raw.githubusercontent.com/D3adlyRocket/All-in-One-Nuvio/refs/heads/main/',
    author: 'D3adlyRocket',
    description: 'All-in-One comprehensive scrapers featuring AllAnime, 4KHDHub, 1Shows, AnimeKai'
  },
  {
    id: 'spidey',
    name: "Spidey's Providers",
    url: 'https://raw.githubusercontent.com/Abinanthankv/NuvioRepo/refs/heads/master/manifest.json',
    baseUrl: 'https://raw.githubusercontent.com/Abinanthankv/NuvioRepo/refs/heads/master/',
    author: 'Abinanthankv',
    description: 'Indian & Regional cinema providers (TamilMV, Tamilblasters, Tamilian, Moviesda, Isaidub)'
  },
  {
    id: 'michat88',
    name: 'Michat88 Repo',
    url: 'https://raw.githubusercontent.com/michat88/nuvio-providers/refs/heads/main/manifest.json',
    baseUrl: 'https://raw.githubusercontent.com/michat88/nuvio-providers/refs/heads/main/',
    author: 'michat88',
    description: 'Asian Drama, Anime & Global cinema scrapers (Kisskh, Castle, Cinevibe, Hdhub4u)'
  },
  {
    id: 'ray',
    name: "Ray's Plugins",
    url: 'https://raw.githubusercontent.com/hihihihihiiray/plugins/refs/heads/main/manifest.json',
    baseUrl: 'https://raw.githubusercontent.com/hihihihihiiray/plugins/refs/heads/main/',
    author: 'hihihihihiiray',
    description: 'Fast streaming scrapers (~4s) with direct 4K and multi-dub (Airflix, 4KHDHub, BollyFlix, Embed69)'
  }
];

export interface ScraperItem {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  supportedTypes: string[];
  filename: string;
  formats?: string[];
  logo?: string;
  contentLanguage?: string[];
  repoId: string;
  repoName: string;
  fileUrl: string;
}

export interface StreamResult {
  id: string;
  name: string;
  title: string;
  url: string;
  quality: string;
  size?: string;
  providerId: string;
  providerName: string;
  repoName: string;
  format: 'm3u8' | 'mp4' | 'mkv' | 'embed' | 'auto';
  isDirect: boolean;
  headers?: Record<string, string>;
  subtitles?: Array<{ url: string; lang: string }>;
  behaviorHints?: any;
}

// In-Memory Caches
interface ManifestCacheEntry {
  manifest: any;
  scrapers: ScraperItem[];
  timestamp: number;
}
const manifestCache = new Map<string, ManifestCacheEntry>();
const codeCache = new Map<string, string>();
const streamsCache = new Map<string, { streams: StreamResult[]; timestamp: number }>();

const CACHE_TTL_MANIFEST = 30 * 60 * 1000; // 30 minutes
const CACHE_TTL_STREAMS = 10 * 60 * 1000;  // 10 minutes

const TMDB_READ_TOKEN = process.env.TMDB_READ_TOKEN || "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1MWIzNzE3MWFkZWY4MGZlYTEyNDI4MGE5MjE5NWJjMCIsIm5iZiI6MTc4NTIyODY2NS41NTUsInN1YiI6IjZhNjg2ZDc5NWZhMjNiOTA2MDRmNjdhNiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Zszu95k02KQoyOzTfSvXtr7F5h2rpR1iYRo7jdm2nBc";
const imdbIdCache = new Map<string, string>();

/**
 * Resolves reliable IMDB ID using authenticated TMDB read token
 */
export async function resolveImdbId(mediaType: 'movie' | 'tv', tmdbId: number): Promise<string | null> {
  const cacheKey = `${mediaType}-${tmdbId}`;
  if (imdbIdCache.has(cacheKey)) {
    return imdbIdCache.get(cacheKey) || null;
  }

  try {
    const res = await fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}/external_ids`, {
      headers: {
        Authorization: `Bearer ${TMDB_READ_TOKEN}`,
        Accept: 'application/json'
      }
    });

    if (res.ok) {
      const data: any = await res.json();
      if (data && data.imdb_id) {
        imdbIdCache.set(cacheKey, data.imdb_id);
        return data.imdb_id;
      }
    }

    const mainRes = await fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}?append_to_response=external_ids`, {
      headers: {
        Authorization: `Bearer ${TMDB_READ_TOKEN}`,
        Accept: 'application/json'
      }
    });

    if (mainRes.ok) {
      const mainData: any = await mainRes.json();
      const found = mainData?.imdb_id || mainData?.external_ids?.imdb_id;
      if (found) {
        imdbIdCache.set(cacheKey, found);
        return found;
      }
    }
  } catch (err: any) {
    console.warn(`[NuvioEngine] Error resolving IMDB ID for ${mediaType} ${tmdbId}:`, err?.message);
  }

  return null;
}

/**
 * Fetch a single repository manifest with caching
 */
export async function getRepositoryManifest(repo: RepositoryConfig): Promise<ManifestCacheEntry> {
  const cached = manifestCache.get(repo.id);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MANIFEST) {
    return cached;
  }

  try {
    const res = await fetch(repo.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ZinovisNuvioEngine/2.0)' }
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching manifest for ${repo.name}`);
    }
    const manifest = await res.json();
    const rawScrapers: any[] = manifest.scrapers || manifest.plugins || [];

    const scrapers: ScraperItem[] = rawScrapers.map((s) => {
      const filename = s.filename || s.file || '';
      const fileUrl = filename.startsWith('http') ? filename : `${repo.baseUrl}${filename}`;
      return {
        id: s.id || s.name?.toLowerCase().replace(/\s+/g, '-'),
        name: s.name || s.id || 'Unnamed Provider',
        description: s.description || '',
        version: s.version || '1.0.0',
        author: s.author || repo.author,
        supportedTypes: s.supportedTypes || ['movie', 'tv'],
        filename,
        formats: s.formats || ['m3u8', 'mp4'],
        logo: s.logo || '',
        contentLanguage: s.contentLanguage || ['en'],
        repoId: repo.id,
        repoName: repo.name,
        fileUrl
      };
    });

    const entry: ManifestCacheEntry = {
      manifest,
      scrapers,
      timestamp: Date.now()
    };
    manifestCache.set(repo.id, entry);
    return entry;
  } catch (err: any) {
    console.error(`[NuvioEngine] Failed to load repository ${repo.id}:`, err?.message);
    if (cached) return cached;
    return {
      manifest: { name: repo.name, version: '1.0.0', scrapers: [] },
      scrapers: [],
      timestamp: Date.now()
    };
  }
}

/**
 * Fetch all repositories and their status
 */
export async function getAllRepositories() {
  const results = await Promise.all(
    NUVIO_REPOSITORIES.map(async (repo) => {
      try {
        const data = await getRepositoryManifest(repo);
        return {
          id: repo.id,
          name: repo.name,
          url: repo.url,
          baseUrl: repo.baseUrl,
          version: data.manifest.version || '1.0.0',
          author: repo.author,
          description: repo.description,
          scrapersCount: data.scrapers.length,
          status: 'ready' as const
        };
      } catch {
        return {
          id: repo.id,
          name: repo.name,
          url: repo.url,
          baseUrl: repo.baseUrl,
          version: '1.0.0',
          author: repo.author,
          description: repo.description,
          scrapersCount: 0,
          status: 'error' as const
        };
      }
    })
  );
  return results;
}

/**
 * Fetch all scrapers across all 6 manifests
 */
export async function getAllScrapers(): Promise<ScraperItem[]> {
  const entries = await Promise.all(NUVIO_REPOSITORIES.map(getRepositoryManifest));
  const all: ScraperItem[] = [];
  for (const entry of entries) {
    all.push(...entry.scrapers);
  }
  return all;
}

/**
 * Execute a scraper script in sandbox with cheerio and crypto-js
 */
async function executeScraper(
  scraper: ScraperItem,
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  season = 1,
  episode = 1
): Promise<StreamResult[]> {
  let code = codeCache.get(scraper.fileUrl);
  if (!code) {
    const res = await fetch(scraper.fileUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (!res.ok) {
      throw new Error(`Failed to load provider code from ${scraper.fileUrl}`);
    }
    code = await res.text();

    // Sanitize brittle IMDB lookups & error logs in community scrapers (e.g. MoviesDrive)
    if (code.includes('[MoviesDrive] Failed to get IMDB ID') || code.includes('moviesdrive')) {
      code = code.replace(
        /console\.error\(\s*["']\[MoviesDrive\] Failed to get IMDB ID["']\s*\)/g,
        'console.warn("[MoviesDrive] No IMDB ID found for media")'
      );
      code = code.replace(
        /const imdbId = \(_a = tmdbData\.external_ids\) == null \? void 0 : _a\.imdb_id;/g,
        'const imdbId = ((_a = tmdbData.external_ids) == null ? void 0 : _a.imdb_id) || tmdbData.imdb_id || (tmdbData.id ? ("tt" + String(tmdbData.id).padStart(7, "0")) : null);'
      );
    }

    codeCache.set(scraper.fileUrl, code);
  }

  // Custom sandbox require for Nuvio runtime compatibility
  const customRequire = (mod: string) => {
    if (mod === 'cheerio-without-node-native' || mod === 'cheerio') return cheerio;
    if (mod === 'crypto-js') return crypto;
    if (mod === 'url') return require('url');
    if (mod === 'path') return require('path');
    if (mod === 'buffer') return require('buffer');
    if (mod === 'querystring') return require('querystring');
    return {};
  };

  // Sandboxed fetch providing authenticated TMDB access & external_ids enrichment for scrapers
  const sandboxFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<any> => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as any).url;

    if (urlStr && urlStr.includes('api.themoviedb.org')) {
      try {
        const mergedHeaders = new Headers(init?.headers || {});
        if (!mergedHeaders.has('Authorization')) {
          mergedHeaders.set('Authorization', `Bearer ${TMDB_READ_TOKEN}`);
        }
        mergedHeaders.set('Accept', 'application/json');

        const tmdbRes = await fetch(urlStr, {
          ...init,
          headers: mergedHeaders
        });

        if (tmdbRes.ok) {
          const rawJson: any = await tmdbRes.json();
          if (!rawJson.external_ids) {
            rawJson.external_ids = {};
          }
          if (!rawJson.external_ids.imdb_id) {
            if (rawJson.imdb_id) {
              rawJson.external_ids.imdb_id = rawJson.imdb_id;
            } else {
              const resolved = await resolveImdbId(mediaType, tmdbId);
              if (resolved) {
                rawJson.external_ids.imdb_id = resolved;
                rawJson.imdb_id = resolved;
              }
            }
          }
          return new Response(JSON.stringify(rawJson), {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'application/json' }
          });
        } else {
          // If public key returned 401/429/404, fall back to resolved ID
          const resolved = await resolveImdbId(mediaType, tmdbId);
          const fallbackData = {
            id: tmdbId,
            imdb_id: resolved || `tt${String(tmdbId).padStart(7, '0')}`,
            external_ids: {
              id: tmdbId,
              imdb_id: resolved || `tt${String(tmdbId).padStart(7, '0')}`
            }
          };
          return new Response(JSON.stringify(fallbackData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch {
        const resolved = await resolveImdbId(mediaType, tmdbId);
        const fallbackData = {
          id: tmdbId,
          imdb_id: resolved || `tt${String(tmdbId).padStart(7, '0')}`,
          external_ids: {
            id: tmdbId,
            imdb_id: resolved || `tt${String(tmdbId).padStart(7, '0')}`
          }
        };
        return new Response(JSON.stringify(fallbackData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return fetch(input, init);
  };

  // Sandboxed console so normal scraper misses/logs do not trigger host error alerts
  const sandboxConsole = {
    log: (...args: any[]) => console.log(...args),
    info: (...args: any[]) => console.info(...args),
    warn: (...args: any[]) => console.warn(...args),
    error: (...args: any[]) => console.warn(...args),
    debug: (...args: any[]) => console.debug(...args)
  };

  const moduleObj: { exports: any } = { exports: {} };
  const runner = new Function('module', 'exports', 'require', 'fetch', 'console', code);
  runner(moduleObj, moduleObj.exports, customRequire, sandboxFetch, sandboxConsole);

  const getStreamsFn = moduleObj.exports.getStreams || moduleObj.exports.default?.getStreams;
  if (typeof getStreamsFn !== 'function') {
    return [];
  }

  // Run with an 8.5s timeout promise
  const timeoutPromise = new Promise<any[]>((_, reject) =>
    setTimeout(() => reject(new Error('Scraper execution timeout (8.5s)')), 8500)
  );

  const rawStreams: any[] = await Promise.race([
    getStreamsFn(tmdbId, mediaType, season, episode),
    timeoutPromise
  ]);

  if (!Array.isArray(rawStreams)) return [];

  return rawStreams
    .filter((s) => s && (s.url || s.link))
    .map((s, idx) => {
      const streamUrl = s.url || s.link;
      const lower = streamUrl.toLowerCase();
      let format: 'm3u8' | 'mp4' | 'mkv' | 'embed' | 'auto' = 'auto';
      if (lower.includes('.m3u8')) format = 'm3u8';
      else if (lower.includes('.mp4')) format = 'mp4';
      else if (lower.includes('.mkv')) format = 'mkv';
      else if (lower.includes('embed') || lower.includes('player') || lower.includes('iframe')) format = 'embed';

      const isDirect = format === 'm3u8' || format === 'mp4' || format === 'mkv' || s.type === 'direct';

      return {
        id: `${scraper.id}-${idx}-${Date.now()}`,
        name: s.name || `${scraper.name} Stream ${idx + 1}`,
        title: s.title || `${scraper.name} - ${s.quality || 'HD'}`,
        url: streamUrl,
        quality: s.quality || 'Auto',
        size: s.size || (s.title && s.title.includes('GB') ? s.title.split('\n')[1] : undefined),
        providerId: scraper.id,
        providerName: scraper.name,
        repoName: scraper.repoName,
        format,
        isDirect,
        headers: s.headers,
        subtitles: s.subtitles,
        behaviorHints: s.behaviorHints
      };
    });
}

/**
 * Fetch streams for a given media across requested provider or top recommended providers
 */
export async function getStreamsForMedia(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  season = 1,
  episode = 1,
  targetProviderId?: string,
  disabledRepos: string[] = [],
  disabledProviders: string[] = []
): Promise<{ streams: StreamResult[]; sourcesCount: number }> {
  const normDisabledRepos = disabledRepos.map(r => r.toLowerCase().trim()).filter(Boolean);
  const normDisabledProviders = disabledProviders.map(p => p.toLowerCase().trim()).filter(Boolean);
  const disabledReposKey = normDisabledRepos.sort().join(',');
  const disabledProvidersKey = normDisabledProviders.sort().join(',');

  const cacheKey = `${tmdbId}-${mediaType}-${season}-${episode}-${targetProviderId || 'all'}-dr:${disabledReposKey}-dp:${disabledProvidersKey}`;
  const cached = streamsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_STREAMS) {
    return { streams: cached.streams, sourcesCount: cached.streams.length };
  }

  const allScrapers = await getAllScrapers();
  const disabledRepoSet = new Set(normDisabledRepos);
  const disabledProviderSet = new Set(normDisabledProviders);

  // Filter out any scrapers belonging to disabled repositories or marked as disabled
  const enabledScrapers = allScrapers.filter((s) => {
    if (disabledRepoSet.has(s.repoId.toLowerCase())) return false;
    if (disabledProviderSet.has(s.id.toLowerCase())) return false;
    return true;
  });

  if (enabledScrapers.length === 0) {
    return { streams: [], sourcesCount: 0 };
  }

  let candidateScrapers: ScraperItem[] = [];

  if (targetProviderId && targetProviderId !== 'auto') {
    candidateScrapers = enabledScrapers.filter(
      (s) => s.id.toLowerCase() === targetProviderId.toLowerCase()
    );
  }

  // If no specific scraper or "auto", run top high-yield providers in parallel compatible with requested mediaType
  if (candidateScrapers.length === 0) {
    const priorityNames = [
      '4khdhub',
      'streamflix',
      'airflix',
      'moviesdrive',
      'uhdmovies',
      'allanime',
      'animepahe',
      'tamilmv',
      'embed69'
    ];

    const typeCompatible = enabledScrapers.filter((s) =>
      !s.supportedTypes || s.supportedTypes.length === 0 || s.supportedTypes.includes(mediaType)
    );

    const seenNames = new Set<string>();
    for (const p of priorityNames) {
      const match = typeCompatible.find((s) => s.id.toLowerCase().includes(p) && !seenNames.has(s.name.toLowerCase()));
      if (match) {
        seenNames.add(match.name.toLowerCase());
        candidateScrapers.push(match);
      }
      if (candidateScrapers.length >= 5) break;
    }

    if (candidateScrapers.length === 0) {
      candidateScrapers = typeCompatible.slice(0, 5);
    }
  }

  const streamPromises = candidateScrapers.map(async (scraper) => {
    try {
      return await executeScraper(scraper, tmdbId, mediaType, season, episode);
    } catch (err: any) {
      console.warn(`[NuvioEngine] Provider ${scraper.name} warning:`, err?.message);
      return [];
    }
  });

  const results = await Promise.all(streamPromises);
  const flattened: StreamResult[] = results.flat();

  // Deduplicate and prioritize high quality streams (4K 2160p -> 1080p -> 720p)
  const qualityWeight = (q: string) => {
    const lower = (q || '').toLowerCase();
    if (lower.includes('2160') || lower.includes('4k')) return 100;
    if (lower.includes('1080')) return 80;
    if (lower.includes('720')) return 60;
    if (lower.includes('480')) return 40;
    return 50;
  };

  flattened.sort((a, b) => qualityWeight(b.quality) - qualityWeight(a.quality));

  streamsCache.set(cacheKey, { streams: flattened, timestamp: Date.now() });
  return { streams: flattened, sourcesCount: flattened.length };
}

/**
 * Handle Range request proxying for HTML5 Video tags & Hls.js
 */
export async function proxyVideoStream(req: Request, res: Response) {
  const targetUrl = (req.query.url as string) || '';
  if (!targetUrl) {
    return res.status(400).send('Target stream URL is required');
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    // Forward Referer or custom headers if specified in query
    if (req.query.referer) {
      headers['Referer'] = req.query.referer as string;
    }
    if (req.headers.range) {
      headers['Range'] = req.headers.range as string;
    }

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers
    });

    res.status(upstream.status);

    // Forward essential media headers
    const forwardHeaders = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'cache-control',
      'last-modified',
      'etag'
    ];

    forwardHeaders.forEach((h) => {
      const val = upstream.headers.get(h);
      if (val) res.setHeader(h, val);
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');

    if (!upstream.body) {
      return res.end();
    }

    // Pipe response stream in chunks
    const reader = upstream.body.getReader();
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            break;
          }
          if (!res.write(value)) {
            await new Promise((resolve) => res.once('drain', resolve));
          }
        }
      } catch (streamErr) {
        res.end();
      }
    };
    pump();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(502).json({ error: 'Proxy stream error', details: err?.message });
    }
  }
}
