# OAuth2.0 Implementation Guide

## Overview

This project now uses **OAuth2.0 Client Credentials** flow to authenticate with the Oceans-X API (https://oceans-x.mpa.gov.sg). This guide explains the setup, security considerations, and troubleshooting.

## Architecture

```
Browser                Server                  Oceans-X API
  |                      |                          |
  | GET /api/arrivals    |                          |
  |--------------------->|                          |
  |                      | getAccessToken()         |
  |                      |------------------------->|
  |                      | Bearer <access_token>    |
  |                      | GET /api/v1/vessel/...   |
  |                      |------------------------->|
  |                      | JSON Response             |
  |<--JSON Response------|<-------------------------|
```

### Key Points:
- **Frontend** (Browser): Never handles sensitive credentials, only calls local proxy
- **Backend** (Server-side): Manages OAuth2 tokens securely, handles token refresh
- **Token Refresh**: Automatic - refreshed when expired (5-minute buffer)
- **Token Storage**: In-memory cache per serverless function (fast, ephemeral)

## Environment Variables

### Frontend (Safe to expose, prefixed with `VITE_`)
These are bundled into the frontend and visible in browser:
```env
VITE_OAUTH_TOKEN_ENDPOINT=https://oceans-x.mpa.gov.sg/oauth2/token
```

### Backend (Server-side only, NO `VITE_` prefix)
These are **never** sent to the browser:
```env
OAUTH_CONSUMER_KEY=fcFPPMX9eQSJtQaXLPdsQcJ5ew0a
OAUTH_CONSUMER_SECRET=IwQa7dmDkDpyjAvu33CQJ_CJFDYa
OAUTH_REVOKE_ENDPOINT=https://wso2-is-prod-is-svc:9443/oauth2/revoke
OAUTH_ACCESS_TOKEN=eyJ0eXAi... (cached token)
OAUTH_TOKEN_EXPIRES_AT=1774250177 (token expiry timestamp)
```

## Local Development Setup

### 1. Install & Configure Environment

```bash
# Copy example file if not done
cp .env.example .env

# Edit .env and set your OAuth2 credentials
OAUTH_CONSUMER_KEY=your_key
OAUTH_CONSUMER_SECRET=your_secret
OAUTH_ACCESS_TOKEN=your_token  # Optional - will auto-refresh
OAUTH_TOKEN_EXPIRES_AT=0       # Will auto-refresh
```

### 2. Run Local Development Server

```bash
# Install dependencies
npm install

# Start dev server with API proxy (handles OAuth2 token refresh)
npm run dev

# In another terminal, if using local mock server:
npm run mock:server
```

### 3. Test OAuth2 Integration

**Test local proxy** (recommended for development):
```bash
curl -X GET http://localhost:3000/api/arrivals/2026-03-23
```

**Expected response:**
```json
[
  {
    "imo": "9876543",
    "vessel_name": "Example Vessel",
    ...
  }
]
```

**Check token refresh logs:**
```bash
# Monitor console output for:
# [oauth2] Using cached access token
# [oauth2] Token invalid or expired, obtaining new token
# [oauth2] Successfully obtained new access token
```

## Production Deployment

### 1. Environment Setup (Vercel/Deployment Platform)

Set these on your platform's environment variables dashboard:

```env
OAUTH_CONSUMER_KEY=fcFPPMX9eQSJtQaXLPdsQcJ5ew0a
OAUTH_CONSUMER_SECRET=IwQa7dmDkDpyjAvu33CQJ_CJFDYa
OAUTH_REVOKE_ENDPOINT=https://wso2-is-prod-is-svc:9443/oauth2/revoke
VITE_OAUTH_TOKEN_ENDPOINT=https://oceans-x.mpa.gov.sg/oauth2/token
```

### 2. API Endpoint Configuration

#### Vercel
No additional setup needed - the `api/` directory is automatically deployed as serverless functions.

#### GitHub Pages (Static Hosting)
If using GitHub Pages, you need a serverless backend:
- Option 1: Deploy to Vercel (`api/` functions auto-deploy)
- Option 2: Deploy to AWS Lambda, Firebase Functions, etc.
- Option 3: Use a custom Node.js server

### 3. CORS Configuration

The Oceans-X API requires proper CORS headers. Ensure your deployment platform:
- Allows outbound HTTPS requests to `https://oceans-x.mpa.gov.sg`
- Has appropriate timeout settings (recommend 8-15 seconds)

### 4. Deployment Checklist

```
☑ OAUTH_CONSUMER_KEY set in environment
☑ OAUTH_CONSUMER_SECRET set in environment (not visible in logs)
☑ Outbound requests to oceans-x.mpa.gov.sg allowed
☑ Backend serverless functions deployed
☑ Frontend environment variables configured
☑ Test API endpoint: GET /api/arrivals/YYYY-MM-DD
```

## Security Best Practices

### ✅ What We're Doing Right

1. **Secret Isolation**: Consumer Secret is `OAUTH_CONSUMER_SECRET` (no `VITE_` prefix).
   - Never exposed to browser
   - Only available server-side

2. **Token Caching**: Tokens cached in-memory per serverless function
   - Reduces token endpoint calls
   - Automatic refresh with 5-minute buffer

3. **Bearer Token Usage**: RFC 6750 compliant
   - Tokens sent in `Authorization: Bearer <token>` header
   - Not exposed in URL or query parameters

4. **Timeout Protection**: 8-second timeout on API calls
   - Prevents hung functions
   - Graceful error handling

5. **HTTPS Only**: All OAuth2 communication over HTTPS
   - Token endpoint: `https://oceans-x.mpa.gov.sg/oauth2/token`
   - Credential transmission secure

### ⚠️ Important Warnings

1. **Don't commit credentials to git**:
   ```bash
   # ❌ WRONG
   echo "OAUTH_CONSUMER_SECRET=secret123" >> .env
   git add .env
   git commit -m "add credentials"

   # ✅ RIGHT
   echo ".env" >> .gitignore
   # Use platform's environment variable dashboard
   ```

2. **Don't expose secrets in logs**:
   - The code sanitizes log output
   - Monitor CI/CD logs for accidental leaks

3. **Secure file permissions**:
   ```bash
   chmod 600 .env  # Only owner can read
   ```

4. **Rotate credentials periodically**:
   - Update Consumer Key/Secret through Oceans-X portal
   - No need to restart functions (picked up on next request)

## Troubleshooting

### Issue: "OAuth2 credentials not configured"

**Cause**: Missing `OAUTH_CONSUMER_KEY` or `OAUTH_CONSUMER_SECRET` in environment

**Fix**:
1. Check `.env` file has both variables set
2. Verify environment variables on deployment platform
3. Restart application/serverless functions

### Issue: "Token endpoint returned 401"

**Cause**: Invalid consumer credentials

**Fix**:
1. Verify `OAUTH_CONSUMER_KEY` and `OAUTH_CONSUMER_SECRET` are correct
2. Check they haven't been swapped
3. Verify credentials haven't been revoked in Oceans-X portal
4. Test credentials manually:
   ```bash
   curl -X POST https://oceans-x.mpa.gov.sg/oauth2/token \
     -H "Authorization: Basic $(echo -n 'KEY:SECRET' | base64)" \
     -d "grant_type=client_credentials"
   ```

### Issue: "CORS error" (in browser console)

**Cause**: Direct browser call to API without proxy

**Fix**:
- This should only happen if using production GitHub Pages setup
- Ensure API proxy is properly configured
- Use the `/api/arrivals/[date]` endpoint, not direct external URL

### Issue: "Upstream timeout"

**Cause**: Oceans-X API is slow or unavailable

**Fix**:
1. Check if oceans-x.mpa.gov.sg is online
2. Verify network connectivity
3. Check API status on Oceans-X dashboard
4. Increase timeout in `api/arrivals/[date].js` if needed (currently 8s)

### Issue: "Token refresh not working"

**Cause**: Container reuse not working, or wrong expiry time

**Debug**:
1. Check logs show `[oauth2]` messages
2. Verify `OAUTH_TOKEN_EXPIRES_AT` is being set
3. Force token refresh during testing:
   ```bash
   # Set expiry to past
   export OAUTH_TOKEN_EXPIRES_AT=0
   ```

## Token Flow Diagram

```
1. Request arrives at /api/arrivals/[date]
   ↓
2. Call getAccessToken()
   ├─ Is cached token valid?
   │  ├─ YES → Use it
   │  └─ NO → Refresh
   ↓
3. If token refresh needed:
   ├─ POST to token_endpoint with client credentials
   ├─ Receive new access_token and expires_in
   ├─ Cache token with expiry timestamp
   └─ Return token
   ↓
4. Make request to Oceans-X API with Bearer token
   ↓
5. Return response to browser
```

## Manual Token Refresh (Testing)

To manually test token refresh:

```javascript
// In api/utils/oauth2.js
const { getAccessToken } = require('../utils/oauth2')

// Force new token
process.env.OAUTH_TOKEN_EXPIRES_AT = '0'

const token = await getAccessToken()
console.log('New token:', token)
```

## Integration with Frontend

The frontend automatically benefits from server-side token management:

```typescript
// src/api/client.ts
export async function fetchArrivals(date: string) {
  // Always calls local proxy in development
  const proxyUrl = `/api/arrivals/${date}`
  const res = await fetch(proxyUrl) // No auth headers needed!
  // Token managed automatically server-side
}
```

## References

- [OAuth 2.0 Client Credentials](https://tools.ietf.org/html/rfc6749#section-4.4)
- [RFC 6750 - Bearer Token Usage](https://tools.ietf.org/html/rfc6750)
- [Oceans-X API Documentation](https://oceans-x.mpa.gov.sg/)
- [Environment Variables in Vercel](https://vercel.com/docs/environment-variables)

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review logs in serverless function console
3. Contact Oceans-X support: https://oceans-x.mpa.gov.sg/
4. Check this project's issues: https://github.com/your-org/vessel-arrival-report-web/issues
