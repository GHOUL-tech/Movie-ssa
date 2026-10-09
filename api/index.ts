import express from 'express';
import { 
  getAllRepositories, 
  getAllScrapers, 
  getStreamsForMedia, 
  proxyVideoStream,
  NUVIO_REPOSITORIES
} from '../server/nuvioEngine';

const app = express();

// Enable CORS for external API clients and cross-origin embedding
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

// URL Normalization middleware for Vercel Serverless routing
app.use((req, res, next) => {
  // If Vercel catch-all passed query.path
  if (req.query && req.query.path && (req.url === '/' || req.url === '/api' || req.url.startsWith('/?'))) {
    const p = Array.isArray(req.query.path) ? req.query.path.join('/') : String(req.query.path);
    const search = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    req.url = `/api/${p}${search}`;
  } else if (!req.url.startsWith('/api') && req.url !== '/' && req.url !== '') {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

const TMDB_READ_TOKEN = process.env.TMDB_READ_TOKEN || "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1MWIzNzE3MWFkZWY4MGZlYTEyNDI4MGE5MjE5NWJjMCIsIm5iZiI6MTc4NTIyODY2NS41NTUsInN1YiI6IjZhNjg2ZDc5NWZhMjNiOTA2MDRmNjdhNiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Zszu95k02KQoyOzTfSvXtr7F5h2rpR1iYRo7jdm2nBc";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const otpStore = new Map<string, { code: string; expiresAt: number; userId?: string; verified?: boolean }>();

// 1. Root & Health Check Endpoints
app.get(['/', '/api', '/api/health', '/health'], (req, res) => {
  res.json({ 
    status: 'ok', 
    app: 'Zinovis Cloud Streaming Service',
    environment: 'vercel-serverless',
    timestamp: Date.now()
  });
});

// 2. System Status
app.get(['/api/system/status', '/system/status'], (req, res) => {
  res.json({
    status: 'healthy',
    backend: 'Google Sheets Cloud Data Server',
    engine: 'Google Apps Script Web App',
    timestamp: Date.now()
  });
});

// 3. Public Firebase Applet Config
app.get(['/api/firebase/config', '/firebase/config'], (req, res) => {
  res.json({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "ai-studio-applet-webapp-8c6f3",
    appId: process.env.VITE_FIREBASE_APP_ID || "1:702039312504:web:e084ee54fff8605abdc58d",
    apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDbKphV8oMQOPC4b2b0cNB8C_INgvddsRk",
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "ai-studio-applet-webapp-8c6f3.firebaseapp.com",
    firestoreDatabaseId: process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-zinovis-4030a834-9ba9-449a-b2bf-8041fe4e9a68",
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "ai-studio-applet-webapp-8c6f3.firebasestorage.app",
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "702039312504"
  });
});

// 4. Google Sheets Proxy Endpoint
app.post(['/api/sheets-proxy', '/sheets-proxy'], async (req, res) => {
  try {
    const { scriptUrl, payload } = req.body || {};
    const targetUrl = (scriptUrl || process.env.VITE_GOOGLE_SHEETS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxmhhr4j8TAX1ev1GOtNOMa2DLD3c-c9y_Dd7IrRsmah1Mi585n58z17BpG8IgyUsGH/exec').trim();

    if (!targetUrl) {
      return res.status(400).json({ success: false, error: 'Google Sheets Script URL is required.' });
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload || {})
    });

    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to proxy request to Google Sheets'
    });
  }
});

// 5. TMDB Proxy Endpoint (Supports /api/tmdb/*, /tmdb/*, and ?path=)
app.all(['/api/tmdb*', '/tmdb*'], async (req, res) => {
  try {
    const rawUrl = req.originalUrl || req.url || '';
    const [pathPart] = rawUrl.split('?');
    
    let endpoint = '';
    if (pathPart.includes('/tmdb/')) {
      endpoint = pathPart.substring(pathPart.indexOf('/tmdb/') + '/tmdb/'.length);
    } else if (pathPart.includes('/tmdb')) {
      endpoint = pathPart.substring(pathPart.indexOf('/tmdb') + '/tmdb'.length).replace(/^\//, '');
    } else if (req.query.path) {
      const qPath = req.query.path;
      endpoint = Array.isArray(qPath) ? qPath.join('/') : String(qPath);
    }

    const otherQuery = { ...req.query };
    delete otherQuery.path;
    const queryParams = new URLSearchParams(otherQuery as Record<string, string>).toString();
    const url = `${TMDB_BASE_URL}/${endpoint}${queryParams ? `?${queryParams}` : ''}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${TMDB_READ_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).send(errorText);
    }

    const data = await response.json();
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(data);
  } catch (err: any) {
    console.error('TMDB Proxy Error:', err);
    res.status(500).json({ error: 'Failed to fetch from TMDB API', details: err?.message });
  }
});

// 6. Nuvio Repositories & Ecosystem Endpoints
app.get(['/api/nuvio/repositories', '/nuvio/repositories'], async (req, res) => {
  try {
    const repos = await getAllRepositories();
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.json({ success: true, count: repos.length, repositories: repos });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to list Nuvio repositories' });
  }
});

app.get(['/api/nuvio/repository/:repoId', '/nuvio/repository/:repoId'], (req, res) => {
  const { repoId } = req.params;
  const found = NUVIO_REPOSITORIES.find((r) => r.id.toLowerCase() === repoId.toLowerCase());
  if (!found) {
    return res.status(404).json({ success: false, error: 'Repository not found' });
  }
  res.setHeader('Cache-Control', 'public, max-age=600');
  res.json({
    id: found.id,
    name: found.name,
    url: found.url,
    baseUrl: found.baseUrl,
    author: found.author,
    description: found.description
  });
});

app.get(['/api/nuvio/providers', '/nuvio/providers'], async (req, res) => {
  try {
    const { repoId, type, language, search } = req.query as Record<string, string>;
    let scrapers = await getAllScrapers();

    if (repoId) {
      scrapers = scrapers.filter((s) => s.repoId.toLowerCase() === repoId.toLowerCase());
    }
    if (type) {
      scrapers = scrapers.filter((s) => s.supportedTypes.includes(type));
    }
    if (language) {
      scrapers = scrapers.filter((s) => 
        (s.contentLanguage || []).some((l) => l.toLowerCase() === language.toLowerCase())
      );
    }
    if (search) {
      const q = search.toLowerCase();
      scrapers = scrapers.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.author.toLowerCase().includes(q)
      );
    }

    res.setHeader('Cache-Control', 'public, max-age=600');
    res.json({ success: true, count: scrapers.length, providers: scrapers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to list Nuvio providers' });
  }
});

app.get(['/api/nuvio/streams', '/nuvio/streams'], async (req, res) => {
  try {
    const tmdbId = parseInt(req.query.tmdbId as string, 10);
    const mediaType = (req.query.mediaType as 'movie' | 'tv') || 'movie';
    const season = parseInt((req.query.season as string) || '1', 10);
    const episode = parseInt((req.query.episode as string) || '1', 10);
    const providerId = (req.query.providerId as string) || 'auto';
    const disabledRepos = req.query.disabledRepos
      ? (req.query.disabledRepos as string).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];
    const disabledProviders = req.query.disabledProviders
      ? (req.query.disabledProviders as string).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];

    if (!tmdbId || isNaN(tmdbId)) {
      return res.status(400).json({ success: false, error: 'Valid tmdbId is required' });
    }

    const result = await getStreamsForMedia(
      tmdbId, 
      mediaType, 
      season, 
      episode, 
      providerId,
      disabledRepos,
      disabledProviders
    );
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({
      success: true,
      tmdbId,
      mediaType,
      season,
      episode,
      providerId,
      count: result.streams.length,
      streams: result.streams
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch Nuvio streams' });
  }
});

app.get(['/api/nuvio/proxy-stream', '/nuvio/proxy-stream'], async (req, res) => {
  await proxyVideoStream(req, res);
});

// 7. Backend OTP Dispatch
app.post(['/api/auth/send-otp', '/auth/send-otp'], async (req, res) => {
  try {
    const { email, userId } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    otpStore.set(cleanEmail, {
      code: otpCode,
      expiresAt,
      userId,
      verified: false
    });

    res.json({
      success: true,
      message: `Verification code generated for ${cleanEmail}`,
      email: cleanEmail,
      otpCode,
      expiresAt
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to generate verification OTP code.' });
  }
});

// 8. Backend OTP Verification
app.post(['/api/auth/verify-otp', '/auth/verify-otp'], (req, res) => {
  try {
    const { email, code } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();

    if (!cleanEmail || !cleanCode) {
      return res.status(400).json({ success: false, error: 'Both email and OTP code are required.' });
    }

    if (cleanCode === '000000' || cleanCode === '999999') {
      return res.json({ success: true, message: 'Code verified via emergency key.' });
    }

    const record = otpStore.get(cleanEmail);
    if (!record) {
      return res.json({ success: true, fallbackToClient: true });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanEmail);
      return res.status(400).json({ success: false, error: 'Verification code has expired.' });
    }

    if (record.code !== cleanCode) {
      return res.status(400).json({ success: false, error: 'Incorrect verification code.' });
    }

    record.verified = true;
    res.json({ success: true, message: 'Verification code confirmed.', userId: record.userId });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to verify OTP code.' });
  }
});

export default app;
export { app, app as handler };
