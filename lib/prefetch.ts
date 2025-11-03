/**
 * ⚡ Data Prefetching System
 * Preloads common data to improve perceived performance
 */

import { PartidoAPI } from './api'
import { apiCache } from './api-cache'
import { logger } from './logger'

// Track prefetched routes
const prefetchedRoutes = new Set<string>()

/**
 * Check if connection is fast enough for prefetching
 */
function shouldPrefetch(): boolean {
  if (typeof window === 'undefined') return false
  
  // Check if user has data saver mode enabled
  if ('connection' in navigator) {
    const conn = (navigator as any).connection
    if (conn?.saveData) {
      logger.log('[Prefetch] Skipping - data saver enabled')
      return false
    }
    
    // Skip on slow connections (2G, slow-2g)
    if (conn?.effectiveType && ['slow-2g', '2g'].includes(conn.effectiveType)) {
      logger.log('[Prefetch] Skipping - slow connection')
      return false
    }
  }
  
  return true
}

/**
 * Prefetch Next.js route
 */
export function prefetchRoute(href: string): void {
  if (!shouldPrefetch()) return
  
  if (prefetchedRoutes.has(href)) {
    logger.log(`[Prefetch] Already prefetched: ${href}`)
    return
  }

  prefetchedRoutes.add(href)
  
  try {
    // Create link prefetch
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = href
    document.head.appendChild(link)
    logger.log(`[Prefetch] ✓ Route: ${href}`)
  } catch (error) {
    logger.error(`[Prefetch] Error loading ${href}:`, error)
  }
}

/**
 * Prefetch common user flows based on current route
 */
export function prefetchUserFlow(currentRoute: string) {
  const flows: Record<string, string[]> = {
    '/home': ['/matches', '/profile', '/create-match'],
    '/matches': ['/home', '/my-matches'],
    '/my-matches': ['/matches', '/home'],
    '/profile': ['/settings', '/home'],
    '/search': ['/matches', '/home'],
  }

  const nextRoutes = flows[currentRoute] || []
  
  nextRoutes.forEach(route => {
    setTimeout(() => prefetchRoute(route), 100)
  })
}

/**
 * Precarga datos comunes de la aplicación
 */
export async function prefetchCommonData() {
  if (!shouldPrefetch()) return
  
  try {
    // Prefetch partidos disponibles (silently in background)
    PartidoAPI.list({}).catch(() => {
      // Ignorar errores de prefetch
    })
  } catch (error) {
    // Ignorar errores de prefetch
  }
}

/**
 * Precarga datos del usuario autenticado
 */
export async function prefetchUserData(userId: string) {
  if (!shouldPrefetch()) return
  
  try {
    // Prefetch mis partidos
    PartidoAPI.listByUser(userId).catch(() => {})
  } catch (error) {
    // Ignorar errores
  }
}

/**
 * Invalida caché después de mutaciones
 */
export function invalidatePartidosCache() {
  apiCache.clearPattern('/api/partidos')
}

export function invalidateInscripcionesCache() {
  apiCache.clearPattern('/api/inscripciones')
}

export function invalidateUsuariosCache() {
  apiCache.clearPattern('/api/usuarios')
}

