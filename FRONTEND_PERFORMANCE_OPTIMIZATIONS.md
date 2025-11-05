# 🚀 Frontend Performance Optimizations

## 📊 Current Status

### ✅ Already Implemented
1. **Next.js Config** (`next.config.mjs`)
   - ✅ SWC Minification
   - ✅ Image Optimization (AVIF, WebP)
   - ✅ Font Optimization
   - ✅ Compression (gzip/brotli)
   - ✅ Remove console logs in production
   - ✅ Cache headers for static assets
   - ✅ Build ID for version control

2. **Code Splitting**
   - ✅ Dynamic imports with `next/dynamic`
   - ✅ Package optimization (date-fns, recharts)
   - ✅ Lazy components (`lib/lazy-components.tsx`)

3. **Caching**
   - ✅ Photo cache (`lib/photo-cache.ts`)
   - ✅ API cache manager (`lib/api-cache-manager.ts`)
   - ✅ Use API cache hook (`hooks/use-api-cache.ts`)

4. **Performance Monitoring**
   - ✅ Performance hooks (`hooks/use-performance.ts`)
   - ✅ Logger with levels (`lib/logger.ts`)
   - ✅ Error boundaries (`components/error-boundary.tsx`)

5. **Network Optimizations**
   - ✅ Fetch with timeout (`lib/fetch-with-timeout.ts`)
   - ✅ Retry logic with exponential backoff
   - ✅ Smart polling (`hooks/use-smart-polling.ts`)

## 🎯 HIGH IMPACT Optimizations to Implement

### 1. **React.memo() on Heavy Components** 
Priority: ⭐⭐⭐ CRITICAL

**Problem**: Components re-render unnecessarily on parent state changes.

**Solution**: Wrap expensive components in `React.memo()`.

```tsx
// BEFORE
export function MatchCard({ match, onJoin }) {
  // ...
}

// AFTER
export const MatchCard = React.memo(function MatchCard({ match, onJoin }) {
  // ...
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if match.id changed
  return prevProps.match.id === nextProps.match.id && 
         prevProps.match.estado === nextProps.match.estado;
});
```

**Files to optimize**:
- `components/pages/match/match-card.tsx` (if exists)
- `components/pages/match/matches-listing.tsx`
- `components/pages/home-screen.tsx`
- `components/ui/user-avatar.tsx` ✅ Already has PhotoCache
- `components/google-maps/matches-map-view.tsx`

### 2. **useMemo() for Expensive Calculations**
Priority: ⭐⭐⭐ CRITICAL

**Problem**: Filtering/sorting large lists on every render.

```tsx
// BEFORE
const filteredMatches = matches.filter(m => m.estado === 'DISPONIBLE')
  .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

// AFTER
const filteredMatches = useMemo(() => {
  return matches
    .filter(m => m.estado === 'DISPONIBLE')
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}, [matches]); // Only recalculate when matches change
```

**Files to add**:
- `components/pages/match/matches-listing.tsx` - Filter/sort matches
- `components/pages/search-screen.tsx` - Search results
- `components/pages/home-screen.tsx` - User inscriptions
- `components/pages/match/my-matches-screen.tsx` - User's matches

### 3. **useCallback() for Event Handlers**
Priority: ⭐⭐ HIGH

**Problem**: Creating new function instances on every render breaks memoization.

```tsx
// BEFORE
<Button onClick={() => handleJoin(match.id)}>Unirse</Button>

// AFTER
const handleJoinClick = useCallback((matchId: string) => {
  handleJoin(matchId);
}, [handleJoin]);

<Button onClick={() => handleJoinClick(match.id)}>Unirse</Button>
```

### 4. **Debouncing Input Fields**
Priority: ⭐⭐⭐ CRITICAL

**Problem**: Search makes API call on every keystroke.

```tsx
import { useDebouncedValue } from '@/hooks/use-debounced-value';

// Search input
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebouncedValue(searchTerm, 500); // 500ms delay

useEffect(() => {
  if (debouncedSearch) {
    performSearch(debouncedSearch);
  }
}, [debouncedSearch]);
```

**Files to add**:
- `components/pages/search-screen.tsx` - Search input
- `components/pages/match/matches-listing.tsx` - Filter input
- `components/pages/user/friends-screen.tsx` - Search friends

### 5. **Virtual Scrolling for Long Lists**
Priority: ⭐⭐ HIGH

**Problem**: Rendering 1000+ items causes lag.

```bash
pnpm add @tanstack/react-virtual
```

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function LongList({ items }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated row height
    overscan: 5, // Render 5 extra items outside viewport
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <MatchCard match={items[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Already implemented**: `hooks/use-virtual-list.ts` ✅

**Files to apply**:
- `components/pages/match/matches-listing.tsx` - All matches
- `components/pages/notifications-screen.tsx` - Notifications list
- `components/pages/chats/chats-screen.tsx` - Chat history

### 6. **Intersection Observer for Lazy Image Loading**
Priority: ⭐⭐ HIGH

```tsx
import { useEffect, useRef, useState } from 'react';

function LazyImage({ src, alt, ...props }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={imgRef}
      src={isVisible ? src : undefined}
      alt={alt}
      loading="lazy"
      {...props}
    />
  );
}
```

### 7. **Prefetching Critical Data**
Priority: ⭐⭐⭐ CRITICAL

Already exists in `lib/prefetch.ts` ✅

**Enhance with**:
```tsx
// On hover, prefetch match details
<Link
  href={`/matches/${match.id}`}
  onMouseEnter={() => prefetchMatchDetails(match.id)}
>
  Ver partido
</Link>
```

### 8. **Service Worker for Offline Caching**
Priority: ⭐ MEDIUM

```typescript
// public/sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/images/logo.png',
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

### 9. **Bundle Analysis**
Priority: ⭐⭐ HIGH

```bash
# Install analyzer
pnpm add -D @next/bundle-analyzer

# Analyze
ANALYZE=true pnpm build
```

### 10. **Optimize Google Maps Loading**
Priority: ⭐⭐⭐ CRITICAL

Already exists: `lib/google-maps-loader.ts` ✅

**Enhance with**:
- Lazy load maps only when tab is active
- Use static map images for previews
- Cache map tiles

## 📈 Expected Performance Gains

| Optimization | Expected Improvement | Effort |
|-------------|---------------------|--------|
| React.memo() | 30-50% faster renders | Low |
| useMemo/useCallback | 20-30% faster | Low |
| Debouncing | 70% fewer API calls | Low |
| Virtual scrolling | 90% faster long lists | Medium |
| Image lazy loading | 40% faster initial load | Low |
| Service worker | Instant repeat visits | High |

## 🎯 Implementation Priority

1. ⭐⭐⭐ **CRITICAL** (Do Now):
   - React.memo on heavy components
   - useMemo for filtering/sorting
   - Debouncing search inputs
   - Prefetching on hover

2. ⭐⭐ **HIGH** (This Week):
   - Virtual scrolling for lists
   - Lazy image loading
   - useCallback for handlers

3. ⭐ **MEDIUM** (Future):
   - Service worker
   - Bundle analysis
   - Advanced caching strategies

## 🔍 Monitoring Tools

```typescript
// Add to components
import { usePerformance } from '@/hooks/use-performance';

function MyComponent() {
  usePerformance('MyComponent');
  // Logs render time, re-renders, etc.
}
```

## 📦 Bundle Size Targets

- **First Load JS**: < 200 KB (currently optimized)
- **Total Bundle**: < 500 KB
- **Individual routes**: < 50 KB each
- **Image lazy load**: < 50 KB above fold

## ⚡ Quick Wins (< 30 minutes each)

1. Add React.memo to 5 components: **30 min**
2. Add useMemo to matches filtering: **15 min**
3. Add debounce to search: **20 min**
4. Optimize image sizes: **20 min**
5. Add loading="lazy" to images: **10 min**

**Total time for 5 quick wins**: ~2 hours
**Expected performance gain**: 40-60% faster
