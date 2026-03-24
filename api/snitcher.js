/**
 * Vercel Serverless Function — Snitcher API Proxy
 *
 * Proxies requests to api.snitcher.com server-side so the browser
 * never hits CORS restrictions. The API token is passed via the
 * X-Snitcher-Token header and forwarded as a Bearer token.
 *
 * Usage:
 *   GET /api/snitcher?path=workspaces
 *   GET /api/snitcher?path=workspaces/{id}/organisations&per_page=100&page=1&date_from=2025-01-01&date_to=2025-12-31
 */
export default async function handler(req, res) {
  // CORS — only needed when testing locally via vercel dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Snitcher-Token, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Validate token
  const token = req.headers['x-snitcher-token'];
  if (!token) {
    return res.status(401).json({ error: 'Missing X-Snitcher-Token header' });
  }

  // Build upstream URL — separate 'path' from the remaining query params
  const { path: snitcherPath, ...forwardParams } = req.query;
  if (!snitcherPath) {
    return res.status(400).json({ error: 'Missing path query parameter' });
  }

  const upstream = new URL(`https://api.snitcher.com/v1/${snitcherPath}`);
  for (const [k, v] of Object.entries(forwardParams)) {
    upstream.searchParams.set(k, v);
  }

  try {
    const response = await fetch(upstream.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: `Upstream error: ${err.message}` });
  }
}
