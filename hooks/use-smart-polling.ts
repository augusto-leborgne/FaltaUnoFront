/**
 * Smart Polling Hook
 * 
 * Features:
 * - Pauses when tab is inactive (saves battery/bandwidth)
 * - Exponential backoff on errors
 * - Adaptive interval based on activity
 * - Auto-cleanup
 */

import { useEffect, useRef, useCallback } from 'react'
import { logger } from '@/lib/logger'

interface UseSmartPollingOptions {
  /** Polling interval in ms (default: 5000) */
  interval?: number
  /** Enable polling (default: true) */
  enabled?: boolean
  /** Pause when tab is hidden (default: true) */
  pauseWhenHidden?: boolean
  /** Slower interval when tab is hidden (default: 30000) */
  hiddenInterval?: number
  /** Enable exponential backoff on errors (default: true) */
  exponentialBackoff?: boolean
  /** Max backoff interval (default: 60000) */
  maxBackoff?: number
}

export function useSmartPolling(
  callback: () => void | Promise<void>,
  options: UseSmartPollingOptions = {}
) {
  const {
    interval = 5000,
    enabled = true,
    pauseWhenHidden = true,
    hiddenInterval = 30000,
    exponentialBackoff = true,
    maxBackoff = 60000,
  } = options

  const intervalRef = useRef<NodeJS.Timeout>()
  const callbackRef = useRef(callback)
  const currentInterval = useRef(interval)
  const errorCount = useRef(0)
  const isHidden = useRef(false)

  // Update callback ref
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Handle visibility change
  useEffect(() => {
    if (!pauseWhenHidden) return

    const handleVisibilityChange = () => {
      const hidden = document.hidden
      isHidden.current = hidden

      logger.log(`[SmartPolling] Tab ${hidden ? 'hidden' : 'visible'}`)

      // Restart polling with appropriate interval
      if (enabled) {
        stopPolling()
        startPolling()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, pauseWhenHidden])

  const executeCallback = useCallback(async () => {
    try {
      await callbackRef.current()
      
      // Reset error count and interval on success
      if (errorCount.current > 0) {
        logger.log('[SmartPolling] Recovered from errors')
        errorCount.current = 0
        currentInterval.current = interval
      }
    } catch (error) {
      logger.error('[SmartPolling] Error:', error)
      
      if (exponentialBackoff) {
        errorCount.current++
        const backoff = Math.min(
          interval * Math.pow(2, errorCount.current),
          maxBackoff
        )
        currentInterval.current = backoff
        logger.log(`[SmartPolling] Backing off to ${backoff}ms`)
      }
    }
  }, [interval, exponentialBackoff, maxBackoff])

  const startPolling = useCallback(() => {
    const activeInterval = isHidden.current && pauseWhenHidden
      ? hiddenInterval
      : currentInterval.current

    logger.log(`[SmartPolling] Starting with interval ${activeInterval}ms`)

    intervalRef.current = setInterval(() => {
      executeCallback()
    }, activeInterval)
  }, [executeCallback, pauseWhenHidden, hiddenInterval])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = undefined
      logger.log('[SmartPolling] Stopped')
    }
  }, [])

  // Start/stop polling based on enabled state
  useEffect(() => {
    if (!enabled) {
      stopPolling()
      return
    }

    // Initial execution
    executeCallback()

    // Start polling
    startPolling()

    return () => {
      stopPolling()
    }
  }, [enabled, startPolling, stopPolling, executeCallback])

  return {
    stop: stopPolling,
    restart: () => {
      stopPolling()
      startPolling()
    },
    resetBackoff: () => {
      errorCount.current = 0
      currentInterval.current = interval
    },
  }
}

/**
 * Adaptive polling that adjusts interval based on data changes
 */
export function useAdaptivePolling<T>(
  fetcher: () => Promise<T>,
  comparator: (prev: T | null, next: T) => boolean,
  options: UseSmartPollingOptions = {}
) {
  const previousData = useRef<T | null>(null)
  const unchangedCount = useRef(0)
  const baseInterval = options.interval || 5000

  const adaptiveCallback = useCallback(async () => {
    const data = await fetcher()
    
    const hasChanged = !previousData.current || comparator(previousData.current, data)
    
    if (hasChanged) {
      // Data changed - reset to base interval
      unchangedCount.current = 0
      options.interval = baseInterval
      logger.log('[AdaptivePolling] Data changed, using base interval')
    } else {
      // Data unchanged - slow down
      unchangedCount.current++
      
      if (unchangedCount.current >= 3) {
        // After 3 unchanged polls, double the interval (up to 30s)
        options.interval = Math.min(baseInterval * 2, 30000)
        logger.log(`[AdaptivePolling] No changes, slowing to ${options.interval}ms`)
      }
    }
    
    previousData.current = data
  }, [fetcher, comparator, baseInterval])

  return useSmartPolling(adaptiveCallback, options)
}
