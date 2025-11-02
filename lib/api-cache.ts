/**
 * ⚡ API Request Cache & Deduplication
 * Prevents duplicate requests and caches GET responses
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry>();
  private pendingRequests = new Map<string, PendingRequest>();
  private readonly DEFAULT_TTL = 60000; // 60 seconds (aumentado para mejor performance)
  private readonly MAX_PENDING_TIME = 10000; // 10 seconds

  /**
   * Generate cache key from URL and options
   */
  private getCacheKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  /**
   * Get cached response if available and not expired
   */
  get(url: string, options?: RequestInit): any | null {
    const key = this.getCacheKey(url, options);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached response with TTL
   */
  set(url: string, data: any, options?: RequestInit, ttl: number = this.DEFAULT_TTL): void {
    const key = this.getCacheKey(url, options);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Check if request is already in-flight
   */
  hasPendingRequest(url: string, options?: RequestInit): boolean {
    const key = this.getCacheKey(url, options);
    const pending = this.pendingRequests.get(key);

    if (!pending) return false;

    // Clean up old pending requests (timeout after 10s)
    if (Date.now() - pending.timestamp > this.MAX_PENDING_TIME) {
      this.pendingRequests.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get pending request promise
   */
  getPendingRequest(url: string, options?: RequestInit): Promise<any> | null {
    const key = this.getCacheKey(url, options);
    return this.pendingRequests.get(key)?.promise || null;
  }

  /**
   * Register a pending request
   */
  setPendingRequest(url: string, promise: Promise<any>, options?: RequestInit): void {
    const key = this.getCacheKey(url, options);
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    // Auto-cleanup when promise resolves/rejects
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for specific URL pattern
   */
  clearPattern(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Invalidate cache after mutations
   */
  invalidate(patterns: string[]): void {
    patterns.forEach(pattern => this.clearPattern(pattern));
  }
}

// Global singleton instance
export const apiCache = new ApiCache();

/**
 * Cached fetch wrapper - only caches GET requests
 */
export async function cachedFetch(
  url: string,
  options?: RequestInit,
  cacheTTL?: number
): Promise<Response> {
  const method = options?.method?.toUpperCase() || 'GET';

  // Only cache GET requests
  if (method !== 'GET') {
    return fetch(url, options);
  }

  // Check cache first
  const cached = apiCache.get(url, options);
  if (cached !== null) {
    console.log(`[API Cache] HIT: ${url}`);
    // Return fake Response with cached data
    return new Response(JSON.stringify(cached), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check if same request is already in-flight (deduplication)
  if (apiCache.hasPendingRequest(url, options)) {
    console.log(`[API Cache] DEDUP: ${url}`);
    const pendingPromise = apiCache.getPendingRequest(url, options);
    if (pendingPromise) {
      const data = await pendingPromise;
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Make actual request
  console.log(`[API Cache] MISS: ${url}`);
  const fetchPromise = fetch(url, options)
    .then(async (response) => {
      if (response.ok) {
        const data = await response.clone().json();
        // Cache successful responses
        apiCache.set(url, data, options, cacheTTL);
        return response;
      }
      return response;
    });

  // Register as pending request
  const dataPromise = fetchPromise.then(r => r.clone().json());
  apiCache.setPendingRequest(url, dataPromise, options);

  return fetchPromise;
}
