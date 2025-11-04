/**
 * Sistema de caché global para API calls
 * Reduce llamadas redundantes al backend
 */

import { logger } from './logger'

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

class ApiCacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private pendingRequests: Map<string, Promise<any>> = new Map()

  /**
   * Configuración de TTL por tipo de recurso
   */
  private ttlConfig: Record<string, number> = {
    user: 5 * 60 * 1000,      // 5 minutos
    partido: 2 * 60 * 1000,    // 2 minutos  
    partidos: 1 * 60 * 1000,   // 1 minuto (listas)
    amigos: 5 * 60 * 1000,     // 5 minutos
    reviews: 10 * 60 * 1000,   // 10 minutos
    stats: 5 * 60 * 1000,      // 5 minutos
    novedades: 15 * 60 * 1000, // 15 minutos
    default: 2 * 60 * 1000     // 2 minutos por defecto
  }

  /**
   * Obtener TTL según el tipo de recurso
   */
  private getTTL(key: string): number {
    for (const [type, ttl] of Object.entries(this.ttlConfig)) {
      if (key.includes(type)) return ttl
    }
    return this.ttlConfig.default
  }

  /**
   * Obtener datos del caché o hacer fetch
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { force?: boolean; ttl?: number }
  ): Promise<T> {
    const now = Date.now()
    
    // Si force=true, saltar caché
    if (options?.force) {
      logger.log(`[Cache] Force refresh for ${key}`)
      return this.fetch(key, fetcher, options.ttl)
    }

    // Verificar caché
    const cached = this.cache.get(key)
    if (cached && now < cached.expiresAt) {
      logger.log(`[Cache] ✅ HIT: ${key} (${Math.round((cached.expiresAt - now) / 1000)}s restantes)`)
      return cached.data
    }

    // Caché expirado o no existe
    if (cached) {
      logger.log(`[Cache] ⏱️  STALE: ${key} - revalidando`)
    } else {
      logger.log(`[Cache] ❌ MISS: ${key}`)
    }

    return this.fetch(key, fetcher, options?.ttl)
  }

  /**
   * Fetch con deduplicación y manejo robusto de errores
   */
  private async fetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    customTTL?: number
  ): Promise<T> {
    // Deduplicación: si ya hay un request pendiente, esperar ese
    if (this.pendingRequests.has(key)) {
      logger.log(`[Cache] 🔄 Deduplicando request: ${key}`)
      return this.pendingRequests.get(key)!
    }

    // Crear nuevo request con timeout y retry
    const promise = this.executeWithRetry(fetcher, key)
      .then(data => {
        const now = Date.now()
        const ttl = customTTL || this.getTTL(key)
        
        // Guardar en caché solo si los datos son válidos
        if (data !== null && data !== undefined) {
          this.cache.set(key, {
            data,
            timestamp: now,
            expiresAt: now + ttl
          })
          
          logger.log(`[Cache] 💾 Guardado: ${key} (TTL: ${ttl/1000}s)`)
        }
        
        // Limpiar request pendiente
        this.pendingRequests.delete(key)
        
        return data
      })
      .catch(error => {
        // En caso de error, limpiar request pendiente
        this.pendingRequests.delete(key)
        
        // ⚡ FALLBACK: Si tenemos datos stale, devolverlos en lugar de error
        const stale = this.cache.get(key)
        if (stale) {
          logger.warn(`[Cache] ⚠️ Error en fetch, usando datos stale: ${key}`)
          return stale.data
        }
        
        logger.error(`[Cache] ❌ Error en fetch sin fallback: ${key}`, error)
        throw error
      })

    // Guardar como pendiente
    this.pendingRequests.set(key, promise)
    
    return promise
  }

  /**
   * Ejecutar fetcher con retry automático en caso de errores de red
   */
  private async executeWithRetry<T>(
    fetcher: () => Promise<T>,
    key: string,
    maxRetries = 2
  ): Promise<T> {
    let lastError: any
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fetcher()
      } catch (error: any) {
        lastError = error
        
        // No reintentar en errores 4xx (cliente)
        if (error?.status >= 400 && error?.status < 500) {
          throw error
        }
        
        // Reintentar solo en errores 5xx o de red
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 3000) // Exponential backoff
          logger.warn(`[Cache] 🔄 Reintentando ${key} en ${delay}ms (intento ${attempt + 1}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError
  }

  /**
   * Invalidar caché para una key específica
   */
  invalidate(key: string) {
    if (this.cache.has(key)) {
      logger.log(`[Cache] 🗑️  Invalidando: ${key}`)
      this.cache.delete(key)
    }
  }

  /**
   * Invalidar múltiples keys con patrón
   */
  invalidatePattern(pattern: string | RegExp) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
    let count = 0
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        count++
      }
    }
    
    if (count > 0) {
      logger.log(`[Cache] 🗑️  Invalidadas ${count} entradas con patrón: ${pattern}`)
    }
  }

  /**
   * Limpiar toda la caché
   */
  clear() {
    const size = this.cache.size
    this.cache.clear()
    this.pendingRequests.clear()
    logger.log(`[Cache] 🗑️  Cache limpiado (${size} entradas)`)
  }

  /**
   * Obtener estadísticas de caché
   */
  getStats() {
    const now = Date.now()
    const entries = Array.from(this.cache.entries())
    
    return {
      total: entries.length,
      active: entries.filter(([_, entry]) => now < entry.expiresAt).length,
      expired: entries.filter(([_, entry]) => now >= entry.expiresAt).length,
      pending: this.pendingRequests.size
    }
  }

  /**
   * Limpiar entradas expiradas (garbage collection)
   */
  gc() {
    const now = Date.now()
    let removed = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key)
        removed++
      }
    }
    
    if (removed > 0) {
      logger.log(`[Cache] 🧹 GC: Removidas ${removed} entradas expiradas`)
    }
    
    return removed
  }
}

// Singleton instance
export const apiCache = new ApiCacheManager()

// Auto garbage collection cada 5 minutos
if (typeof window !== 'undefined') {
  setInterval(() => apiCache.gc(), 5 * 60 * 1000)
}
