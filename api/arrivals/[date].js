const { getAccessToken } = require('../utils/oauth2')

module.exports = async (req, res) => {
  const { date } = req.query || {}

  // Validate date parameter
  if (!date) {
    return res.status(400).json({ error: 'Missing date parameter' })
  }

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      error: 'Invalid date format',
      detail: 'Date must be in YYYY-MM-DD format (e.g., 2026-03-23)'
    })
  }

  const url = `https://oceans-x.mpa.gov.sg/api/v1/vessel/arrivals/1.0.0/date/${encodeURIComponent(date)}`

  try {
    // Get OAuth2 access token (will refresh if needed)
    let accessToken
    try {
      accessToken = await getAccessToken()
    } catch (err) {
      console.error('[api/arrivals] Failed to obtain OAuth2 access token:', err.message)
      return res.status(500).json({
        error: 'Authentication error',
        detail: 'Failed to obtain OAuth2 token'
      })
    }

    // Implement 8-second timeout to avoid hanging functions
    const controller = new AbortController()
    const timeoutMs = 8000
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    let r
    try {
      r = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      })
    } catch (err) {
      clearTimeout(timeout)
      if (err && err.name === 'AbortError') {
        return res.status(504).json({
          error: 'Upstream timeout',
          detail: `No response within ${timeoutMs}ms`
        })
      }
      console.error('[api/arrivals] fetch error', err)
      return res.status(502).json({
        error: 'Failed to fetch arrivals data',
        detail: String(err)
      })
    } finally {
      clearTimeout(timeout)
    }

    const bodyText = await r.text()
    res.status(r.status)

    const contentType = r.headers.get('content-type') || 'application/json'
    res.setHeader('Content-Type', contentType)

    // Cache successful responses for 60 seconds
    if (r.ok) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
    }

    // Forward body as JSON
    try {
      if (contentType.includes('application/json')) {
        return res.json(JSON.parse(bodyText))
      }
    } catch (_) {
      // fall back to text
    }

    return res.type(contentType.split(';')[0]).send(bodyText)
  } catch (err) {
    console.error('[api/arrivals] unexpected error', err)
    return res.status(502).json({
      error: 'Proxy failure',
      detail: String(err)
    })
  }
}
