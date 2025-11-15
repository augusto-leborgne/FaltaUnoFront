/**
 * Observability Provider
 * Wrapper que automáticamente registra métricas y logs
 */

'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AppMetrics } from '@/lib/observability/metrics'
import { cloudLogger } from '@/lib/observability/cloud-logger'
import { AuthService } from '@/lib/auth'

export function ObservabilityProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    // Track page views
    AppMetrics.pageView(pathname)
    
    // Measure page load time
    if (typeof window !== 'undefined' && window.performance) {
      const loadTime = performance.now()
      AppMetrics.pageLoadTime(loadTime)
    }

    // Update user ID in logger
    const user = AuthService.getUser()
    if (user?.id) {
      cloudLogger.setUserId(user.id)
    }
  }, [pathname])

  useEffect(() => {
    // Track Web Vitals
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        // Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const lcp = entry as PerformanceEntry
            AppMetrics.pageLoadTime(lcp.startTime)
            cloudLogger.info('Web Vital - LCP', { 
              value: lcp.startTime,
              page: pathname 
            })
          }
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

        // First Input Delay (FID)
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const fid = entry as any
            cloudLogger.info('Web Vital - FID', { 
              value: fid.processingStart - fid.startTime,
              page: pathname 
            })
          }
        })
        fidObserver.observe({ entryTypes: ['first-input'] })

        // Cumulative Layout Shift (CLS)
        let clsValue = 0
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const cls = entry as any
            if (!cls.hadRecentInput) {
              clsValue += cls.value
            }
          }
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })

        // Report CLS on page unload
        window.addEventListener('beforeunload', () => {
          cloudLogger.info('Web Vital - CLS', { 
            value: clsValue,
            page: pathname 
          })
        })
      } catch (error) {
        // PerformanceObserver not fully supported
        console.warn('PerformanceObserver not supported:', error)
      }
    }

    // Track JavaScript errors
    const handleError = (event: ErrorEvent) => {
      AppMetrics.error('javascript_error', pathname)
      cloudLogger.error('JavaScript Error', event.error, {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        page: pathname,
      })
    }

    // Track unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      AppMetrics.error('unhandled_rejection', pathname)
      cloudLogger.error('Unhandled Promise Rejection', undefined, {
        reason: event.reason,
        page: pathname,
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [pathname])

  return <>{children}</>
}
