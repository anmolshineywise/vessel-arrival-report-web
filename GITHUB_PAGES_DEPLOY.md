# GitHub Pages Deployment Guide

## Overview

GitHub Pages is a static hosting service, so we need a separate API proxy to keep your API key secure. This guide uses **Cloudflare Workers** (free tier) as the API proxy.

## Architecture

```
GitHub Pages (Static)          Cloudflare Worker (Proxy)         Oceans-X API
       │                              │                              │
       │  fetch(/arrivals/date)       │                              │
       │ ───────────────────────────> │                              │
       │                              │  + ApiKey header             │
       │                              │ ────────────────────────────>│
       │                              │                              │
       │                              │  Vessel arrivals data        │
       │                              │ <────────────────────────────│
       │  JSON response               │                              │
       │ <─────────────────────────── │                              │
```

## Step 1: Deploy Cloudflare Worker (API Proxy)

### 1.1 Create Cloudflare Account
1. Go to https://workers.cloudflare.com/
2. Sign up for a free account

### 1.2 Create Worker
1. Click "Create a Worker"
2. Give it a name like `arrivals-proxy`
3. Replace the code with the contents of `workers/arrivals-proxy.js`
4. Click "Save and Deploy"

### 1.3 Add Environment Variable
1. Go to your Worker's Settings > Variables
2. Add environment variable:
   - Name: `VMS_ARRIVALS_API_KEY`
   - Value: Your subscription API key JWT
3. Click "Save"

### 1.4 Note Your Worker URL
Your worker URL will be something like:
```
https://arrivals-proxy.your-subdomain.workers.dev
```

## Step 2: Configure GitHub Repository

### 2.1 Add Repository Secret
1. Go to your GitHub repo > Settings > Secrets and variables > Actions
2. Click "New repository secret"
3. Add:
   - Name: `ARRIVALS_WORKER_URL`
   - Value: `https://arrivals-proxy.your-subdomain.workers.dev`

### 2.2 Enable GitHub Pages
1. Go to Settings > Pages
2. Source: Select "GitHub Actions"

## Step 3: Deploy

### Option A: Automatic (Push to main)
```bash
git add -A
git commit -m "Add GitHub Pages deployment"
git push origin main
```

The GitHub Action will automatically build and deploy to GitHub Pages.

### Option B: Manual
1. Go to Actions tab
2. Select "Deploy to GitHub Pages"
3. Click "Run workflow"

## Step 4: Access Your App

Your app will be available at:
```
https://YOUR_USERNAME.github.io/vessel-arrival-report-web/
```

## Troubleshooting

### CORS Errors
The Cloudflare Worker includes CORS headers. If you still get errors:
1. Check the Worker is deployed correctly
2. Verify the `ARRIVALS_WORKER_URL` secret is set
3. Check browser console for the actual error

### 401 Authentication Errors
1. Verify `VMS_ARRIVALS_API_KEY` is set in Cloudflare Worker
2. Make sure the API key is the full JWT token
3. Test the Worker directly: `curl https://your-worker.workers.dev/arrivals/2026-03-25`

### Build Failures
1. Check the Actions tab for error logs
2. Ensure all dependencies are in package.json
3. Run `npm run build` locally first to verify

## Local Development

For local development, you don't need the Cloudflare Worker:
```bash
# Start both frontend and backend
npm run dev &
node server/index.js

# Open http://localhost:5173
```

## Files Reference

| File | Purpose |
|------|---------|
| `workers/arrivals-proxy.js` | Cloudflare Worker code |
| `.github/workflows/deploy.yml` | GitHub Actions workflow |
| `.env.example` | Environment variables template |
