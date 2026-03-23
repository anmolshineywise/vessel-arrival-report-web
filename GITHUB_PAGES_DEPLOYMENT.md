# GitHub Pages Deployment Guide

This app is configured to deploy to GitHub Pages with automated CI/CD.

## Quick Start

### Option 1: Automatic Deployment (Recommended)

Push to `main` or `master` branch and GitHub Actions will automatically:
1. Build the project
2. Deploy to GitHub Pages

Check `.github/workflows/deploy.yml` for the workflow configuration.

### Option 2: Manual Deployment

1. **Install gh-pages**:
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Deploy**:
   ```bash
   npm run deploy:gh-pages
   ```

## Configuration

### Repository Path
The app is configured to deploy to `/vessel-arrival-report-web/` (project repository).

**If deploying to user/organization pages**, update in `package.json`:
```bash
"build:gh-pages": "vite build --base=/"
```

And in GitHub Actions workflow, set:
```bash
VITE_BASE_PATH: /
```

## GitHub Pages Settings

1. Go to **Settings** → **Pages**
2. Select **GitHub Actions** as the deployment source
3. The workflow will automatically deploy on push

## Environment Variables

For GitHub Pages deployments, ensure:
- `VITE_API_BASE` is set for local API calls (development only)
- `VITE_VESSEL_API_KEY` is embedded in client code for demo purposes
- The external API (oceans-x.mpa.gov.sg) must allow CORS

## Development vs Production

- **Development** (`npm run dev`):
  - Tries local proxy first
  - Falls back to direct external API call
  - Proxy configured to `http://localhost:3000`

- **Production** (GitHub Pages):
  - Calls external API directly
  - Requires CORS support from oceans-x.mpa.gov.sg
  - CORS header: `api-key` or `ApiKey`

## Troubleshooting

### CORS Errors
If you see CORS errors when calling the external API:
1. Check that `ApiKey` header is correct
2. Verify the external API allows CORS
3. Consider using a CORS proxy:
   - https://cors-anywhere.herokuapp.com/
   - https://api.allorigins.win/

### 404 on Deployment
If pages show 404, check:
1. GitHub Pages is enabled in repository settings
2. Build workflow completed successfully
3. Base path is correctly set for your repository

## Deployment Status

Check deployment status:
- GitHub repository → **Actions** tab
- View workflow runs and logs
