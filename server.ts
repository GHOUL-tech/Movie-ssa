import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const TMDB_READ_TOKEN = process.env.TMDB_READ_TOKEN || "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1MWIzNzE3MWFkZWY4MGZlYTEyNDI4MGE5MjE5NWJjMCIsIm5iZiI6MTc4NTIyODY2NS41NTUsInN1YiI6IjZhNjg2ZDc5NWZhMjNiOTA2MDRmNjdhNiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Zszu95k02KQoyOzTfSvXtr7F5h2rpR1iYRo7jdm2nBc";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'Cinescope Streaming Service' });
  });

  // TMDB Proxy Endpoint
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
    console.log(`Cinescope server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
