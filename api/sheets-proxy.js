export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { scriptUrl, payload } = req.body || {};
    const targetUrl = (scriptUrl || process.env.VITE_GOOGLE_SHEETS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbz7YNTg6z9jfeT8l4N1PQeygjYHSwPq9iW9vvDj93_O7rvjR0vLk7AiVrMtad9NUvZN/exec').trim();

    const response = await fetch(targetUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload || {})
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to proxy request to Google Sheets' });
  }
}
