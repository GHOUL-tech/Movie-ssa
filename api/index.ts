import express from 'express';

const app = express();
app.use(express.json());

const TMDB_READ_TOKEN = process.env.TMDB_READ_TOKEN || "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1MWIzNzE3MWFkZWY4MGZlYTEyNDI4MGE5MjE5NWJjMCIsIm5iZiI6MTc4NTIyODY2NS41NTUsInN1YiI6IjZhNjg2ZDc5NWZhMjNiOTA2MDRmNjdhNiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Zszu95k02KQoyOzTfSvXtr7F5h2rpR1iYRo7jdm2nBc";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Zinovis Streaming Service (Vercel)' });
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

export default app;
