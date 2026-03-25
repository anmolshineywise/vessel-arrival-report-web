/**
 * Cloudflare Worker - Vessel Arrivals API Proxy
 *
 * This worker proxies requests to the Oceans-X Vessel Arrivals API,
 * keeping the API key secure (not exposed to browsers).
 *
 * Deploy to Cloudflare Workers (free tier available):
 * 1. Go to https://workers.cloudflare.com/
 * 2. Create a new Worker
 * 3. Paste this code
 * 4. Add environment variable: VMS_ARRIVALS_API_KEY
 * 5. Deploy and get your Worker URL
 * 6. Update your GitHub Pages app to use this URL
 */

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Extract date from URL path: /arrivals/2026-03-25
    const url = new URL(request.url);
    const pathMatch = url.pathname.match(/^\/arrivals\/(\d{4}-\d{2}-\d{2})$/);

    if (!pathMatch) {
      return new Response(JSON.stringify({
        error: 'Invalid path',
        detail: 'Use /arrivals/YYYY-MM-DD format'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const date = pathMatch[1];

    // Get API key from environment
    const apiKey = env.VMS_ARRIVALS_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'Configuration error',
        detail: 'API key not configured'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Call the external API
    const externalUrl = `https://oceans-x.mpa.gov.sg/api/v1/vessel/arrivals/1.0.0/date/${date}`;

    try {
      const response = await fetch(externalUrl, {
        headers: {
          'Accept': 'application/json',
          'ApiKey': apiKey,
        },
      });

      const data = await response.text();

      return new Response(data, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 's-maxage=60, stale-while-revalidate=120',
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({
        error: 'Proxy error',
        detail: String(err)
      }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};
