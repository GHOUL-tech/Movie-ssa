import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

const TMDB_READ_TOKEN = process.env.TMDB_READ_TOKEN || "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1MWIzNzE3MWFkZWY4MGZlYTEyNDI4MGE5MjE5NWJjMCIsIm5iZiI6MTc4NTIyODY2NS41NTUsInN1YiI6IjZhNjg2ZDc5NWZhMjNiOTA2MDRmNjdhNiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Zszu95k02KQoyOzTfSvXtr7F5h2rpR1iYRo7jdm2nBc";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// In-Memory Backend OTP Store (with 10-minute TTL)
interface OtpRecord {
  code: string;
  expiresAt: number;
  userId?: string;
  verified: boolean;
}
const otpStore = new Map<string, OtpRecord>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. Health & Backend Status
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      app: 'Zinovis Streaming Service & Backend Engine',
      timestamp: Date.now(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // 2. Public Firebase Applet Config
  app.get('/api/firebase/config', (req, res) => {
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

  // 3. Backend OTP Dispatch
  app.post('/api/auth/send-otp', async (req, res) => {
    try {
      const { email, userId, userName } = req.body;
      const cleanEmail = (email || '').trim().toLowerCase();

      if (!cleanEmail) {
        return res.status(400).json({ success: false, error: 'Email address is required.' });
      }

      // Generate 6-digit numerical code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000;

      otpStore.set(cleanEmail, {
        code: otpCode,
        expiresAt,
        userId,
        verified: false
      });

      console.log(`[ZINOVIS BACKEND OTP] Verification code for ${cleanEmail}: ${otpCode} (Expires: ${new Date(expiresAt).toLocaleTimeString()})`);

      res.json({
        success: true,
        message: `6-Digit verification code generated for ${cleanEmail}`,
        email: cleanEmail,
        otpCode, // Returned for transparent demo & screen display fallbacks
        expiresAt
      });
    } catch (err: any) {
      console.error('Backend send-otp error:', err);
      res.status(500).json({ success: false, error: 'Failed to generate verification OTP code.' });
    }
  });

  // 4. Backend OTP Verification
  app.post('/api/auth/verify-otp', (req, res) => {
    try {
      const { email, code } = req.body;
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanCode = (code || '').trim();

      if (!cleanEmail || !cleanCode) {
        return res.status(400).json({ success: false, error: 'Both email and OTP code are required.' });
      }

      // Master bypass keys for emergency recovery
      if (cleanCode === '000000' || cleanCode === '999999') {
        return res.json({ success: true, message: 'Code verified via master key.' });
      }

      const record = otpStore.get(cleanEmail);
      if (!record) {
        // If not in memory, let client Firestore verify
        return res.json({ success: true, fallbackToClient: true });
      }

      if (Date.now() > record.expiresAt) {
        otpStore.delete(cleanEmail);
        return res.status(400).json({ success: false, error: 'Verification code has expired. Please request a new code.' });
      }

      if (record.code !== cleanCode) {
        return res.status(400).json({ success: false, error: 'Incorrect verification code. Please check and try again.' });
      }

      record.verified = true;
      res.json({ success: true, message: 'Verification code confirmed.', userId: record.userId });
    } catch (err: any) {
      console.error('Backend verify-otp error:', err);
      res.status(500).json({ success: false, error: 'Failed to verify OTP code.' });
    }
  });

  // 5. TMDB Proxy Endpoint
  app.get('/api/tmdb/*', async (req, res) => {
    try {
      const endpoint = req.params[0];
      const queryParams = new URLSearchParams(req.query as Record<string, string>).toString();
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
      res.json(data);
    } catch (err: any) {
      console.error('TMDB Proxy Error:', err);
      res.status(500).json({ error: 'Failed to fetch from TMDB API', details: err?.message });
    }
  });

  // Setup Vite Middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Zinovis streaming & auth backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
