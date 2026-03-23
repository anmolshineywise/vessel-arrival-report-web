/**
 * OAuth2 Token Manager
 * Handles obtaining and refreshing OAuth2 tokens for server-side API calls
 * Uses client credentials grant flow (machine-to-machine authentication)
 */

// In-memory token cache (for serverless functions that reuse container)
let tokenCache = {
  accessToken: process.env.OAUTH_ACCESS_TOKEN || null,
  expiresAt: parseInt(process.env.OAUTH_TOKEN_EXPIRES_AT || '0', 10),
}

/**
 * Check if current token is still valid
 * Considers a token expired if it has less than 5 minutes remaining
 */
function isTokenValid() {
  if (!tokenCache.accessToken) return false
  const now = Date.now()
  const buffer = 5 * 60 * 1000 // 5 minute buffer
  return tokenCache.expiresAt > now + buffer
}

/**
 * Obtain a new OAuth2 access token using client credentials
 */
async function obtainNewToken() {
  const consumerKey = process.env.OAUTH_CONSUMER_KEY
  const consumerSecret = process.env.OAUTH_CONSUMER_SECRET
  const tokenEndpoint = process.env.VITE_OAUTH_TOKEN_ENDPOINT || 'https://oceans-x.mpa.gov.sg/oauth2/token'

  if (!consumerKey || !consumerSecret) {
    throw new Error('OAuth2 credentials not configured. Missing OAUTH_CONSUMER_KEY or OAUTH_CONSUMER_SECRET')
  }

  // Create Basic Auth header
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')

  try {
    console.log('[oauth2] Requesting new access token from', tokenEndpoint)

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Token endpoint returned ${response.status}: ${errText}`)
    }

    const data = await response.json()

    if (!data.access_token) {
      throw new Error('No access token in response')
    }

    // Cache the token with expiration time
    // OAuth2 typically returns expires_in in seconds, timestamp in milliseconds
    const expiresIn = data.expires_in || 3600 // default 1 hour if not specified
    const expiresAt = Date.now() + (expiresIn * 1000)

    tokenCache = {
      accessToken: data.access_token,
      expiresAt,
    }

    console.log('[oauth2] Successfully obtained new access token, expires in', expiresIn, 'seconds')
    return data.access_token
  } catch (err) {
    console.error('[oauth2] Failed to obtain token:', err.message)
    throw err
  }
}

/**
 * Get a valid OAuth2 access token
 * Automatically refreshes if current token is expired or invalid
 */
async function getAccessToken() {
  // Check if we have a valid cached token
  if (isTokenValid()) {
    console.log('[oauth2] Using cached access token')
    return tokenCache.accessToken
  }

  // Token is invalid or expired, get a new one
  console.log('[oauth2] Token invalid or expired, obtaining new token')
  return obtainNewToken()
}

/**
 * Revoke an access token (cleanup)
 */
async function revokeToken(token) {
  const revokeEndpoint = process.env.OAUTH_REVOKE_ENDPOINT

  if (!revokeEndpoint) {
    console.warn('[oauth2] Revoke endpoint not configured, skipping token revocation')
    return
  }

  const consumerKey = process.env.OAUTH_CONSUMER_KEY
  const consumerSecret = process.env.OAUTH_CONSUMER_SECRET

  if (!consumerKey || !consumerSecret) {
    console.warn('[oauth2] OAuth2 credentials not configured, skipping token revocation')
    return
  }

  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')

  try {
    console.log('[oauth2] Revoking access token')

    const response = await fetch(revokeEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `token=${encodeURIComponent(token)}`,
    })

    if (response.ok) {
      console.log('[oauth2] Successfully revoked access token')
    } else {
      console.warn('[oauth2] Token revocation returned', response.status)
    }
  } catch (err) {
    console.error('[oauth2] Failed to revoke token:', err.message)
  }
}

module.exports = {
  getAccessToken,
  revokeToken,
  isTokenValid,
}
