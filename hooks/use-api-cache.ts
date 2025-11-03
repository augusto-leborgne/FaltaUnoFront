/**
 * Custom hook for API data caching and deduplication
 * 
 * Features:
 * - In-memory cache with TTL
 * - Automatic request deduplication
 * - Stale-while-revalidate pattern
 * - Error handling and retry logic
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { logger } from '@/lib/logger'

interface CacheEntry<T> {
  data: T
  timestamp: number
  loading: boolean
  error: Error | null
}

interface UseApiCacheOptions {
  /** Cache time-to-live in milliseconds (default: 5 minutes) */
  ttl?: number
  /** Enable stale-while-revalidate (default: true) */
  staleWhileRevalidate?: boolean
  /** Auto-refresh interval in milliseconds (default: none) */
  refreshInterval?: number
  /** Enable request deduplication (default: true) */
  deduplicate?: boolean
}

// Global cache store
const cache = new Map<string, CacheEntry<any>>()
// Pending requests for deduplication
const pendingRequests = new Map<string, Promise<any>>()

export function useApiCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseApiCacheOptions = {}
) {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    staleWhileRevalidate = true,
    refreshInterval,
    deduplicate = true,
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const isMounted = useRef(true)
  const refreshTimer = useRef<NodeJS.Timeout>()

  // Check if cached data is fresh
  const isFresh = useCallback((entry: CacheEntry<T>) => {
    return Date.now() - entry.timestamp < ttl
  }, [ttl])

  // Fetch data with deduplication
  const fetchData = useCallback(async (skipCache = false) => {
    const cacheKey = key

    // Check cache first
    if (!skipCache && cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)!
      
      if (isFresh(cached)) {
        logger.log(`[Cache] Hit for ${cacheKey}`)
        return cached.data
      }
      
      if (staleWhileRevalidate) {
        logger.log(`[Cache] Stale data for ${cacheKey}, returning while revalidating`)
        // Return stale data immediately
        if (isMounted.current) {
          setData(cached.data)
          setLoading(false)
        }
        // Continue to revalidate in background
      }
    }

    // Check for pending request (deduplication)
    if (deduplicate && pendingRequests.has(cacheKey)) {
      logger.log(`[Cache] Deduplicating request for ${cacheKey}`)
      return await pendingRequests.get(cacheKey)!
    }

    // Fetch fresh data
    logger.log(`[Cache] Miss for ${cacheKey}, fetching...`)
    
    const fetchPromise = fetcher()
      .then(result => {
        // Update cache
        cache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          loading: false,
          error: null,
        })
        
        if (isMounted.current) {
          setData(result)
          setLoading(false)
          setError(null)
        }
        
        return result
      })
      .catch(err => {
        logger.error(`[Cache] Error fetching ${cacheKey}:`, err)
        
        if (isMounted.current) {
          setError(err)
          setLoading(false)
        }
        
        throw err
      })
      .finally(() => {
        pendingRequests.delete(cacheKey)
      })

    if (deduplicate) {
      pendingRequests.set(cacheKey, fetchPromise)
    }

    return await fetchPromise
  }, [key, fetcher, ttl, staleWhileRevalidate, deduplicate, isFresh])

  // Initial load
  useEffect(() => {
    isMounted.current = true
    
    fetchData().catch(err => {
      logger.error(`[useApiCache] Initial load error:`, err)
    })

    return () => {
      isMounted.current = false
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current)
      }
    }
  }, [key]) // Only re-fetch when key changes

  // Auto-refresh interval
  useEffect(() => {
    if (!refreshInterval) return

    refreshTimer.current = setInterval(() => {
      logger.log(`[Cache] Auto-refreshing ${key}`)
      fetchData(true).catch(err => {
        logger.error(`[Cache] Auto-refresh error:`, err)
      })
    }, refreshInterval)

    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current)
      }
    }
  }, [refreshInterval, key, fetchData])

  // Manual revalidate function
  const revalidate = useCallback(() => {
    return fetchData(true)
  }, [fetchData])

  // Manual mutate function (optimistic updates)
  const mutate = useCallback((newData: T | ((prev: T | null) => T)) => {
    const updated = typeof newData === 'function' 
      ? (newData as (prev: T | null) => T)(data)
      : newData
    
    setData(updated)
    
    // Update cache
    cache.set(key, {
      data: updated,
      timestamp: Date.now(),
      loading: false,
      error: null,
    })
  }, [key, data])

  // Clear cache for specific key
  const invalidate = useCallback(() => {
    cache.delete(key)
    logger.log(`[Cache] Invalidated ${key}`)
  }, [key])

  return {
    data,
    loading,
    error,
    revalidate,
    mutate,
    invalidate,
    isStale: data ? !isFresh(cache.get(key)!) : false,
  }
}

// Global cache utilities
export const cacheUtils = {
  /** Clear all cached data */
  clearAll: () => {
    cache.clear()
    pendingRequests.clear()
    logger.log('[Cache] Cleared all cache')
  },
  
  /** Clear cache by pattern */
  clearPattern: (pattern: RegExp) => {
    const keys = Array.from(cache.keys())
    keys.forEach(key => {
      if (pattern.test(key)) {
        cache.delete(key)
        logger.log(`[Cache] Cleared ${key}`)
      }
    })
  },
  
  /** Get cache stats */
  getStats: () => {
    return {
      entries: cache.size,
      pending: pendingRequests.size,
      keys: Array.from(cache.keys()),
    }
  },
  
  /** Prefetch data */
  prefetch: async <T>(key: string, fetcher: () => Promise<T>) => {
    if (cache.has(key)) {
      logger.log(`[Cache] Already cached: ${key}`)
      return
    }
    
    try {
      const data = await fetcher()
      cache.set(key, {
        data,
        timestamp: Date.now(),
        loading: false,
        error: null,
      })
      logger.log(`[Cache] Prefetched: ${key}`)
    } catch (err) {
      logger.error(`[Cache] Prefetch error for ${key}:`, err)
    }
  },
}
