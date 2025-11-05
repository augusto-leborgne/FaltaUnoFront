/**
 * ⚡ Performance Monitoring Utilities
 * Track and optimize app performance
 */

import { logger } from "./logger";

interface PerformanceMetrics {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private marks: Map<string, number> = new Map();

  /**
   * Mark the start of a performance measurement
   */
  start(name: string): void {
    if (typeof window === 'undefined') return;
    
    this.marks.set(name, performance.now());
    
    // Use Performance API if available
    if (performance.mark) {
      performance.mark(`${name}-start`);
    }
  }

  /**
   * Mark the end of a performance measurement and log duration
   */
  end(name: string): number | null {
    if (typeof window === 'undefined') return null;
    
    const startTime = this.marks.get(name);
    if (!startTime) {
      logger.warn(`[Performance] No start mark found for: ${name}`);
      return null;
    }

    const duration = performance.now() - startTime;
    this.marks.delete(name);

    // Store metric
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
    });

    // Use Performance API if available
    if (performance.mark && performance.measure) {
      performance.mark(`${name}-end`);
      try {
        performance.measure(name, `${name}-start`, `${name}-end`);
      } catch (e) {
        // Ignore if marks don't exist
      }
    }

    // Log slow operations (> 1 second)
    if (duration > 1000) {
      logger.warn(`[Performance] Slow operation: ${name} took ${duration.toFixed(2)}ms`);
    } else if (duration > 100 && process.env.NODE_ENV !== 'production') {
      logger.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get metrics for a specific operation
   */
  getMetric(name: string): PerformanceMetrics[] {
    return this.metrics.filter(m => m.name === name);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.marks.clear();
    
    if (typeof performance !== 'undefined' && performance.clearMarks) {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }

  /**
   * Report Web Vitals if available
   */
  reportWebVitals(): void {
    if (typeof window === 'undefined') return;
    if (process.env.NODE_ENV === 'production') return;

    // First Contentful Paint (FCP)
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    if (fcp) {
      logger.log(`[Web Vitals] FCP: ${fcp.startTime.toFixed(2)}ms`);
    }

    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          logger.log(`[Web Vitals] LCP: ${lastEntry.renderTime || lastEntry.loadTime}ms`);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // Browser doesn't support LCP
      }
    }

    // First Input Delay (FID) - approximation
    if ('PerformanceObserver' in window) {
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const fid = (entry as any).processingStart - entry.startTime;
            logger.log(`[Web Vitals] FID: ${fid.toFixed(2)}ms`);
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        // Browser doesn't support FID
      }
    }

    // Cumulative Layout Shift (CLS)
    if ('PerformanceObserver' in window) {
      try {
        let clsScore = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsScore += (entry as any).value;
            }
          }
          logger.log(`[Web Vitals] CLS: ${clsScore.toFixed(4)}`);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        // Browser doesn't support CLS
      }
    }
  }
}

// Global singleton
export const performanceMonitor = new PerformanceMonitor();

/**
 * Utility function to measure async operations
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  performanceMonitor.start(name);
  try {
    const result = await fn();
    performanceMonitor.end(name);
    return result;
  } catch (error) {
    performanceMonitor.end(name);
    throw error;
  }
}

/**
 * Utility function to measure sync operations
 */
export function measure<T>(name: string, fn: () => T): T {
  performanceMonitor.start(name);
  try {
    const result = fn();
    performanceMonitor.end(name);
    return result;
  } catch (error) {
    performanceMonitor.end(name);
    throw error;
  }
}

/**
 * Debounce function for performance
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Initialize Web Vitals reporting in production
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  // Delay to not impact initial load
  setTimeout(() => {
    performanceMonitor.reportWebVitals();
  }, 3000);
}
