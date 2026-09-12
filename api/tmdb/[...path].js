export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const TMDB_READ_TOKEN = process.env.TMDB_READ_TOKEN || "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1MWIzNzE3MWFkZWY4MGZlYTEyNDI4MGE5MjE5NWJjMCIsIm5iZiI6MTc4NTIyODY2NS41NTUsInN1YiI6IjZhNjg2ZDc5NWZhMjNiOTA2MDRmNjdhNiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Zszu95k02KQoyOzTfSvXtr7F5h2rpR1iYRo7jdm2nBc";
    const TMDB_BASE_URL = "https://api.themoviedb.org/3";

    const { path: queryPath, ...otherParams } = req.query;
    const pathStr = Array.isArray(queryPath) ? queryPath.join('/') : (queryPath || '');
    const queryParams = new URLSearchParams(otherParams).toString();
    const targetUrl = `${TMDB_BASE_URL}/${pathStr}${queryParams ? `?${queryParams}` : ''}`;

    const response = await fetch(targetUrl, {
      headers: {
        'Authorization': `Bearer ${TMDB_READ_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'TMDB proxy error' });
  }
}
