/**
 * Utilidades para manejo robusto de llamadas API
 */

import { logger } from "./logger";

/**
 * Retry configuration for critical API calls
 */
export interface RetryConfig {
  maxRetries?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  shouldRetry: (error: any) => {
    // Retry on network errors, 5xx errors, or timeout errors
    if (error.name === 'AbortError' || error.message?.includes('timeout')) return true;
    if (error.status >= 500) return true;
    return false;
  }
};

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const { maxRetries, delayMs, backoffMultiplier, shouldRetry } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config
  };

  let lastError: any;
  let delay = delayMs!;

  for (let attempt = 0; attempt <= maxRetries!; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry if this is the last attempt
      if (attempt === maxRetries) break;
      
      // Don't retry if error is not retryable
      if (!shouldRetry!(error)) {
        logger.warn(`[withRetry] Error not retryable, aborting:`, error);
        throw error;
      }

      logger.warn(`[withRetry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms...`, error);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay for next attempt (exponential backoff)
      delay *= backoffMultiplier!;
    }
  }

  logger.error(`[withRetry] All ${maxRetries} retry attempts failed`);
  throw lastError;
}

/**
 * Debounce function to prevent rapid repeated calls
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  };
}

/**
 * Throttle function to limit execution frequency
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let lastRun = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastRun >= limitMs) {
      fn(...args);
      lastRun = now;
    }
  };
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch (error) {
    logger.warn('[safeJsonParse] Failed to parse JSON:', error);
    return fallback;
  }
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: any): boolean {
  return (
    error.name === 'AbortError' ||
    error.message?.includes('network') ||
    error.message?.includes('fetch') ||
    error.message?.includes('timeout') ||
    !navigator.onLine
  );
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Network errors are retryable
  if (isNetworkError(error)) return true;
  
  // 5xx server errors are retryable
  if (error.status >= 500 && error.status < 600) return true;
  
  // 429 (rate limit) is retryable
  if (error.status === 429) return true;
  
  return false;
}

/**
 * Format error for user display
 */
export function formatErrorMessage(error: any): string {
  // Network errors
  if (isNetworkError(error)) {
    return "Error de conexión. Verifica tu internet e intenta nuevamente.";
  }
  
  // Server errors
  if (error.status >= 500) {
    return "Error del servidor. Intenta nuevamente en unos momentos.";
  }
  
  // Client errors
  if (error.status >= 400 && error.status < 500) {
    return error.message || "Solicitud inválida. Verifica los datos ingresados.";
  }
  
  // Generic error
  return error.message || "Error inesperado. Intenta nuevamente.";
}
