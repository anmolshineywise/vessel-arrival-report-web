# OAuth2 Integration Guide

This document describes the OAuth2 authentication setup for the Vessel Arrival Report Web Application.

## Overview

The application supports two authentication methods for the Oceans-X API:

1. **Legacy API Key** (Development/Demo): Simple bearer token via `ApiKey` header
2. **OAuth2** (Production): Token-based authentication via `Authorization: Bearer` header

The API client automatically detects which credentials are available in the environment and uses OAuth2 if present, with fallback to ApiKey.

## Environment Variables

### OAuth2 Credentials

```bash
# Consumer credentials for OAuth2 flow
VITE_OAUTH_CONSUMER_KEY=fcFPPMX9eQSJtQaXLPdsQcJ5ew0a
VITE_OAUTH_CONSUMER_SECRET=IwQa7dmDkDpyjAvu33CQJ_CJFDYa

# OAuth2 token endpoint
VITE_OAUTH_TOKEN_ENDPOINT=https://oceans-x.mpa.gov.sg/oauth2/token

# Access token (JWT) - obtained by exchanging consumer credentials
VITE_OAUTH_ACCESS_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGc...
```

### Legacy API Key (Development)

```bash
# Legacy ApiKey for development/testing only
VMS_ARRIVALS_API_KEY=eyJ4NXQjUzI1NiI6Ik16Um...
```

## How It Works

### Authentication Flow in fetchArrivals()

1. **Check for OAuth2 Token**: If `VITE_OAUTH_ACCESS_TOKEN` is set, use it as Bearer token
   - Header: `Authorization: Bearer <access_token>`
2. **Fallback to API Key**: If OAuth2 token is missing, try legacy `VMS_ARRIVALS_API_KEY`
   - Header: `ApiKey: <api_key>`
3. **Log Authentication Type**: Console logs indicate which method is being used for debugging

### Request Example (OAuth2)

```typescript
const headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGc...' // OAuth2 access token
}

const response = await fetch(
  'https://oceans-x.mpa.gov.sg/api/v1/vessel/arrivals/1.0.0/date/2024-01-15',
  { headers, mode: 'cors' }
)
```

### Request Example (Legacy API Key)

```typescript
const headers = {
  'Accept': 'application/json',
  'ApiKey': 'eyJ4NXQjUzI1NiI6Ik16Um...' // Legacy API key
}

const response = await fetch(
  'https://oceans-x.mpa.gov.sg/api/v1/vessel/arrivals/1.0.0/date/2024-01-15',
  { headers, mode: 'cors' }
)
```

## Token Management

### Current Implementation

- The OAuth2 access token is stored in `.env.local` as a static value
- Token is sent directly in requests without automatic refresh
- **Limitation**: Token will fail when it expires (current token expires at epoch 1774250177)

### Future Improvements

For production deployments with long application lifetime:

1. **Server-Side Token Refresh**: Implement backend endpoint to refresh tokens using Consumer Key/Secret
   - Endpoint: `POST http://localhost:3000/api/oauth/token-refresh`
   - Stores Consumer Secret securely server-side (never in browser)
   - Returns fresh access token to frontend

2. **Automatic Token Refresh**: Check token expiry before each API call
   ```typescript
   if (isTokenExpired()) {
     const newToken = await refreshAccessToken()
     updateEnvironmentVariable('VITE_OAUTH_ACCESS_TOKEN', newToken)
   }
   ```

3. **Error Handling for 401**: If API returns 401 Unauthorized
   - Attempt token refresh
   - Retry original request with new token
   - Show error to user if refresh fails

## Testing

### Development (Local Proxy)

Uses local server proxy at `/api/arrivals/:date`:
```bash
npm run mock:server  # Start mock server in another terminal
# App will try local proxy first, then direct external API
```

### Production (GitHub Pages)

Direct call to external API with CORS:
```bash
# Set OAuth2 credentials in .env.local before deployment
npm run build:gh-pages
npm run deploy:gh-pages
```

### Console Logs

Monitor API calls in browser developer console:
- `[fetchArrivals] Using OAuth2 authentication` → OAuth2 token being used
- `[fetchArrivals] Using legacy ApiKey authentication` → Fallback to API key
- `[fetchArrivals] No authentication credentials found` → No credentials configured

## Security Considerations

### ⚠️ Consumer Secret Never in Browser

The `VITE_OAUTH_CONSUMER_SECRET` is intentionally **NOT** prefixed with `VITE_` to prevent exposure in bundled frontend code.

If you implement token refresh (see Future Improvements):
- Keep Consumer Secret on backend only
- Create a secure API endpoint for token refresh
- Never send Consumer Secret to frontend

### ⚠️ Access Token in Browser

The `VITE_OAUTH_ACCESS_TOKEN` IS in the browser (prefixed with `VITE_`).
This is acceptable for:
- Demo/testing applications
- Single-use access tokens
- Short-lived tokens with limited scope

For sensitive production applications:
- Move token storage to secure backend cookie
- Use backend-to-backend authentication
- Implement proper CORS policies

## Configuration Summary

| Variable | Purpose | Scope | Example Value |
|----------|---------|-------|----------------|
| `VITE_OAUTH_CONSUMER_KEY` | OAuth2 client ID | Server-side recommended | `fcFPPMX9eQSJt...` |
| `VITE_OAUTH_CONSUMER_SECRET` | OAuth2 client secret | ⚠️ **MUST** be server-side | `IwQa7dmDkDp...` |
| `VITE_OAUTH_TOKEN_ENDPOINT` | Authorization server URL | Public | `https://oceans-x.mpa.gov.sg/oauth2/token` |
| `VITE_OAUTH_ACCESS_TOKEN` | Bearer token for API calls | Browser-side (demo only) | `eyJ0eXAiOiJK...` |
| `VMS_ARRIVALS_API_KEY` | Legacy API key (deprecated) | Server-side | Demo API key |

## Troubleshooting

### "No authentication credentials found"

- Check `.env.local` exists in project root
- Verify `VITE_OAUTH_ACCESS_TOKEN` or `VMS_ARRIVALS_API_KEY` is set
- For GitHub Pages: rebuild and redeploy to pick up new environment variables

### "API Error: 401 - Unauthorized"

- OAuth2 access token has expired
- Need to refresh token using Consumer Key/Secret
- See "Token Management" section for future improvements

### "API Error: 403 - Forbidden"

- Access token or API key is invalid
- Consumer credentials may not have permission for this endpoint
- Verify credentials in Oceans-X dashboard

### Mixed headers in logs

If seeing multiple authentication methods in logs:
- Development: May try both proxy (with auth headers) and direct API call
- Expected behavior: Logs show fallback chain
- Successful requests use only one method
