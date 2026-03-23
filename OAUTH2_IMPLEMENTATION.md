# OAuth2.0 Implementation Summary

## What's Been Implemented

### 1. **Environment Configuration** ✅
- **`.env.example`**: Updated with proper OAuth2 environment variables
- **`.env`**: Production credentials configured
- **`.env.local`**: Local development credentials configured

**Security Feature**: Consumer Secret is `OAUTH_CONSUMER_SECRET` (no `VITE_` prefix) - **never exposed to browser**

### 2. **Server-side OAuth2 Manager** ✅
**File**: `api/utils/oauth2.js`

Features:
- Automatic token refresh when expired
- 5-minute expiry buffer (refreshes early to avoid edge cases)
- In-memory token caching per serverless function
- Basic auth header generation
- Token revocation support
- Comprehensive console logging for debugging

### 3. **Updated API Endpoints** ✅
**File**: `api/arrivals/[date].js`

Changes:
- ✅ Removed legacy `VMS_ARRIVALS_API_KEY` usage
- ✅ Integrated OAuth2 token manager
- ✅ Uses `Authorization: Bearer <token>` header
- ✅ Automatic token refresh on each request if needed

### 4. **Simplified Frontend** ✅
**File**: `src/api/client.ts`

Changes:
- ✅ Removed client-side OAuth2 token handling
- ✅ Frontend now only calls local proxy (no auth headers needed)
- ✅ Server handles all OAuth2 complexity transparently

### 5. **Documentation** ✅
**File**: `OAUTH2_SETUP.md`

Comprehensive guide covering:
- Architecture explanation
- Local development setup
- Production deployment
- Security best practices
- Troubleshooting guide
- Manual testing procedures

## Environment Variables Breakdown

### 🟢 **Safe to Expose** (Frontend, with `VITE_` prefix)
```env
VITE_OAUTH_TOKEN_ENDPOINT=https://oceans-x.mpa.gov.sg/oauth2/token
```

### 🔴 **Server-side Only** (Back-end, NO `VITE_` prefix)
```env
OAUTH_CONSUMER_KEY=fcFPPMX9eQSJtQaXLPdsQcJ5ew0a
OAUTH_CONSUMER_SECRET=IwQa7dmDkDpyjAvu33CQJ_CJFDYa
OAUTH_REVOKE_ENDPOINT=https://wso2-is-prod-is-svc:9443/oauth2/revoke
OAUTH_ACCESS_TOKEN=eyJ0eXAi... (auto-managed by server)
OAUTH_TOKEN_EXPIRES_AT=1774250177 (auto-managed by server)
```

## How It Works

### Request Flow
```
1. Browser → GET /api/arrivals/2026-03-23
2. Server → Check cached OAuth2 token
3. If expired → GET new token from oceans-x.mpa.gov.sg
4. Server → GET /api/v1/vessel/arrivals... with Bearer token
5. Server → Return results to browser ✓
```

## Quick Start (Local Development)

```bash
# 1. Ensure .env.local has your credentials
cat .env.local | grep OAUTH_CONSUMER_KEY

# 2. Start dev server
npm run dev

# 3. Test in another terminal
curl http://localhost:3000/api/arrivals/2026-03-23

# 4. Check logs for [oauth2] messages indicating token refresh
```

## Production Deployment Checklist

- [ ] Set `OAUTH_CONSUMER_KEY` in deployment platform
- [ ] Set `OAUTH_CONSUMER_SECRET` in deployment platform (not visible in logs)
- [ ] Set `OAUTH_REVOKE_ENDPOINT` in deployment platform
- [ ] Ensure outbound HTTPS to oceans-x.mpa.gov.sg allowed
- [ ] Deploy `api/utils/oauth2.js` with your functions
- [ ] Deploy updated `api/arrivals/[date].js`
- [ ] Test: `curl https://your-domain.com/api/arrivals/2026-03-23`

## Security Improvements

✅ **Before**: Legacy API key stored in browser environment variables
✅ **After**:
- OAuth2 credentials server-side only
- Automatic token rotation
- Bearer token (RFC 6750 compliant)
- Token revocation support
- No secrets transmitted to browser

## Testing the Integration

### Test 1: Check token fetch
```bash
# Should show [oauth2] logs indicating token obtained
npm run dev
# In browser: fetch('/api/arrivals/2026-03-23').then(r => r.json())
```

### Test 2: Force token refresh
```bash
# Update .env.local
export OAUTH_TOKEN_EXPIRES_AT=0
npm run dev
# Next request will auto-refresh token
```

### Test 3: Manual OAuth2 test
```bash
curl -X POST https://oceans-x.mpa.gov.sg/oauth2/token \
  -H "Authorization: Basic $(echo -n 'fcFPPMX9eQSJtQaXLPdsQcJ5ew0a:IwQa7dmDkDpyjAvu33CQJ_CJFDYa' | base64)" \
  -d "grant_type=client_credentials"
```

## Files Changed

1. ✅ `.env.example` - Updated with OAuth2 variables
2. ✅ `.env` - Configured with your credentials
3. ✅ `.env.local` - Configured for local dev
4. ✅ `api/utils/oauth2.js` - **NEW** OAuth2 token manager
5. ✅ `api/arrivals/[date].js` - Updated to use OAuth2
6. ✅ `src/api/client.ts` - Simplified frontend
7. ✅ `OAUTH2_SETUP.md` - **NEW** Comprehensive documentation

## Questions or Issues?

1. **"Token not refreshing"** → Check `api/utils/oauth2.js` logs
2. **"401 Unauthorized"** → Verify credentials in platform environment
3. **"CORS error"** → Ensure using proxy endpoint, not direct API
4. **"Token endpoint unreachable"** → Check network/firewall settings

See `OAUTH2_SETUP.md` for detailed troubleshooting guide.
