# Auto-Update System Documentation

## Overview
The frontend now automatically detects new deployments and prompts users to reload, ensuring they always see the latest version without manual refreshing.

## How It Works

### 1. **Unique Build IDs**
- During Docker build, a unique timestamp is generated: `BUILD_TIMESTAMP=$(date +%s)`
- This is passed as a build argument and set as environment variable: `BUILD_ID=build-${BUILD_TIMESTAMP}`
- Next.js uses this in `generateBuildId()` to create a unique identifier for each deployment

### 2. **Version Check Endpoint**
**File:** `app/api/version/route.ts`

Returns the current build ID with no-cache headers:
```json
{
  "buildId": "build-1730318400",
  "timestamp": "2025-10-30T15:00:00.000Z",
  "environment": "production"
}
```

### 3. **Client-Side Polling**
**File:** `hooks/use-version-check.ts`

- Runs only in production (`NODE_ENV=production`)
- Polls `/api/version` every **2 minutes** (120 seconds)
- On first load, stores current `buildId`
- On subsequent checks:
  - If `buildId` changed → shows confirmation dialog
  - If user confirms → clears all caches and hard reloads
  - If user cancels → updates stored `buildId` to stop asking

### 4. **Integration**
**File:** `app/ClientLayout.tsx`

The hook is called once at the root level:
```tsx
export default function ClientLayout({ children }) {
  useVersionCheck()  // ← Automatic version checking
  return <ProtectedRoute>{children}</ProtectedRoute>
}
```

## User Experience

When a new deployment is detected:

```
🎉 Una nueva versión está disponible!

La página se recargará para aplicar las actualizaciones.

[OK] [Cancel]
```

- **OK**: Clears browser cache and reloads with fresh content
- **Cancel**: Continues using current version (won't ask again for this deployment)

## Configuration

### Polling Interval
Default: **2 minutes** (120000ms)

To change, edit `hooks/use-version-check.ts`:
```typescript
const interval = setInterval(checkVersion, 120000) // milliseconds
```

Recommended values:
- Fast updates: 1 minute (60000ms)
- Balanced: 2 minutes (120000ms) ← **Current**
- Conservative: 5 minutes (300000ms)

### Disable for Development
The hook automatically disables in development:
```typescript
if (process.env.NODE_ENV !== 'production') return
```

## Deployment Flow

1. **Developer pushes to `main` branch**
2. **GitHub Actions workflow** (`deploy-frontend.yml`) runs:
   - Generates `BUILD_TIMESTAMP`
   - Builds Docker image with `--build-arg BUILD_TIMESTAMP`
   - Deploys to Cloud Run with `BUILD_ID=build-${BUILD_TIMESTAMP}`
3. **New container starts** with unique build ID
4. **Active users' browsers** poll `/api/version` every 2 minutes
5. **Build ID mismatch detected** → user prompted to reload
6. **User confirms** → fresh content loaded

## Testing

### Verify Build ID
Check the version endpoint:
```bash
curl https://faltauno-frontend-169771742214.us-central1.run.app/api/version
```

Expected response:
```json
{
  "buildId": "build-1730318400",
  "timestamp": "2025-10-30T15:00:00.000Z",
  "environment": "production"
}
```

### Verify Auto-Update in Browser
1. Open browser console (F12)
2. Load the app
3. Look for: `[Version Check] Current build: build-xxxxx`
4. Deploy new version
5. Wait up to 2 minutes
6. Should see: `[Version Check] New version detected! Reloading...`
7. Confirmation dialog appears

### Manual Test
In browser console:
```javascript
// Check current build
fetch('/api/version').then(r => r.json()).then(console.log)

// Simulate version check (for testing)
fetch('/api/version?t=' + Date.now(), {
  cache: 'no-store',
  headers: { 'Cache-Control': 'no-cache' }
}).then(r => r.json()).then(console.log)
```

## Cache Busting

### API Endpoint
Version API uses aggressive no-cache headers:
```typescript
headers: {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}
```

### Client Request
Adds timestamp query parameter:
```typescript
fetch(`/api/version?t=${Date.now()}`)
```

### Hard Reload
Clears all service worker caches before reload:
```typescript
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => caches.delete(name))
  })
}
window.location.reload()
```

## Troubleshooting

### Version check not running
- Check console for: `[Version Check] Current build: ...`
- Verify `NODE_ENV=production` (doesn't run in dev)
- Check `ClientLayout.tsx` calls `useVersionCheck()`

### Users not seeing updates
- Verify new deployment has different `BUILD_ID`
- Check Cloud Run environment variable: `gcloud run services describe faltauno-frontend --format="value(spec.template.spec.containers[0].env)"`
- Test API directly: `curl .../api/version`
- Increase polling frequency for testing

### False positives
- Each deployment MUST have unique BUILD_ID
- Verify `BUILD_TIMESTAMP=$(date +%s)` in workflow
- Check `next.config.mjs` uses `process.env.BUILD_ID`

## Benefits

✅ **Zero Configuration** - Works automatically after deployment  
✅ **User-Friendly** - Asks permission before reloading  
✅ **Fast Updates** - 2-minute detection window  
✅ **Cache-Safe** - Clears all caches on reload  
✅ **Production-Only** - No interference during development  
✅ **Lightweight** - Simple API endpoint, minimal overhead  

## Future Enhancements

Potential improvements:
- Service Worker for background updates
- Visual notification instead of modal dialog
- Configurable polling interval via environment variable
- WebSocket for instant push notifications
- Smart reload during idle time (no active forms/editing)
