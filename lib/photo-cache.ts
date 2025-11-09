/**
 * Photo Cache Manager
 * 
 * Optimiza el rendimiento de carga de fotos de perfil usando:
 * - Cache en memoria (Map)
 * - Cache en sessionStorage (para la sesión actual)
 * - Lazy loading de imágenes
 * - Debouncing de requests
 */

import { logger } from "./logger"

interface CachedPhoto {
  data: string // Base64 data URI
  timestamp: number
  userId: string
}

class PhotoCacheManager {
  private memoryCache: Map<string, CachedPhoto> = new Map()
  private pendingRequests: Map<string, Promise<string | null>> = new Map()
  private readonly CACHE_TTL = 30 * 60 * 1000 // 30 minutos
  private readonly SESSION_STORAGE_KEY = "photo_cache"
  private readonly MAX_MEMORY_CACHE_SIZE = 50 // Máximo 50 fotos en memoria

  constructor() {
    if (typeof window !== "undefined") {
      this.loadFromSessionStorage()
      // Limpiar cache cada 10 minutos
      setInterval(() => this.cleanupExpired(), 10 * 60 * 1000)
    }
  }

  /**
   * Obtiene una foto del cache o la carga si no existe
   */
  async getPhoto(userId: string): Promise<string | null> {
    if (!userId) return null

    // 1. Intentar desde cache en memoria
    const cached = this.memoryCache.get(userId)
    if (cached && !this.isExpired(cached)) {
      logger?.debug?.(`[PhotoCache] HIT memory cache: ${userId}`)
      return cached.data
    }

    // 2. Intentar desde sessionStorage
    const sessionCached = this.getFromSessionStorage(userId)
    if (sessionCached) {
      logger?.debug?.(`[PhotoCache] HIT session cache: ${userId}`)
      // Promover a memoria para próximo acceso
      this.memoryCache.set(userId, sessionCached)
      return sessionCached.data
    }

    // 3. Si ya hay un request pendiente, esperarlo
    const pending = this.pendingRequests.get(userId)
    if (pending) {
      logger?.debug?.(`[PhotoCache] Reusing pending request: ${userId}`)
      return pending
    }

    // 4. Cargar desde servidor
    logger?.debug?.(`[PhotoCache] MISS - loading from server: ${userId}`)
    const loadPromise = this.loadFromServer(userId)
    this.pendingRequests.set(userId, loadPromise)

    try {
      const photo = await loadPromise
      return photo
    } finally {
      this.pendingRequests.delete(userId)
    }
  }

  /**
   * Carga la foto desde el servidor
   */
  private async loadFromServer(userId: string): Promise<string | null> {
    try {
      const { getUserPhotoUrl, API_BASE } = await import("./api")
      const { AuthService } = await import("./auth")

      const token = AuthService.getToken()
      if (!token) return null

      const url = getUserPhotoUrl(userId)
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        // Timeout de 10 segundos
        signal: AbortSignal.timeout(10000),
      })

      // Si es 404, el usuario no tiene foto - no es un error
      if (response.status === 404) {
        logger?.debug?.(`[PhotoCache] User ${userId} has no photo (404)`)
        return null
      }

      if (!response.ok) {
        logger?.warn?.(`[PhotoCache] Failed to load photo for ${userId}: ${response.status}`)
        return null
      }

      const blob = await response.blob()
      
      // Convertir a base64 data URI
      const reader = new FileReader()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })

      // Guardar en cache
      this.set(userId, dataUrl)
      
      return dataUrl
    } catch (error) {
      // No loggear error si es timeout o abort (normal para usuarios sin foto)
      if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
        logger?.debug?.(`[PhotoCache] Timeout loading photo for ${userId}`)
      } else {
        logger?.error?.(`[PhotoCache] Error loading photo for ${userId}:`, error)
      }
      return null
    }
  }

  /**
   * Guarda una foto en el cache
   */
  set(userId: string, photoData: string): void {
    if (!userId || !photoData) return

    const cached: CachedPhoto = {
      data: photoData,
      timestamp: Date.now(),
      userId,
    }

    // Guardar en memoria
    this.memoryCache.set(userId, cached)

    // Guardar en sessionStorage
    this.saveToSessionStorage(userId, cached)

    // Limpiar si el cache en memoria está muy grande
    if (this.memoryCache.size > this.MAX_MEMORY_CACHE_SIZE) {
      this.evictOldest()
    }
  }

  /**
   * Invalida el cache de una foto específica
   */
  invalidate(userId: string): void {
    this.memoryCache.delete(userId)
    this.removeFromSessionStorage(userId)
    logger?.debug?.(`[PhotoCache] Invalidated cache for ${userId}`)
  }

  /**
   * Limpia todo el cache
   */
  clear(): void {
    this.memoryCache.clear()
    this.pendingRequests.clear()
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(this.SESSION_STORAGE_KEY)
    }
    logger?.debug?.("[PhotoCache] Cleared all cache")
  }

  /**
   * Verifica si una entrada está expirada
   */
  private isExpired(cached: CachedPhoto): boolean {
    return Date.now() - cached.timestamp > this.CACHE_TTL
  }

  /**
   * Elimina entradas expiradas
   */
  private cleanupExpired(): void {
    let cleaned = 0
    
    for (const [userId, cached] of this.memoryCache.entries()) {
      if (this.isExpired(cached)) {
        this.memoryCache.delete(userId)
        this.removeFromSessionStorage(userId)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger?.debug?.(`[PhotoCache] Cleaned up ${cleaned} expired entries`)
    }
  }

  /**
   * Elimina la entrada más antigua cuando el cache está lleno
   */
  private evictOldest(): void {
    let oldest: [string, CachedPhoto] | null = null
    
    for (const entry of this.memoryCache.entries()) {
      if (!oldest || entry[1].timestamp < oldest[1].timestamp) {
        oldest = entry
      }
    }

    if (oldest) {
      this.memoryCache.delete(oldest[0])
      this.removeFromSessionStorage(oldest[0])
      logger?.debug?.(`[PhotoCache] Evicted oldest entry: ${oldest[0]}`)
    }
  }

  /**
   * Carga el cache desde sessionStorage
   */
  private loadFromSessionStorage(): void {
    if (typeof window === "undefined") return

    try {
      const stored = sessionStorage.getItem(this.SESSION_STORAGE_KEY)
      if (!stored) return

      const parsed = JSON.parse(stored) as Record<string, CachedPhoto>
      
      for (const [userId, cached] of Object.entries(parsed)) {
        if (!this.isExpired(cached)) {
          this.memoryCache.set(userId, cached)
        }
      }

      logger?.debug?.(`[PhotoCache] Loaded ${this.memoryCache.size} photos from sessionStorage`)
    } catch (error) {
      logger?.error?.("[PhotoCache] Error loading from sessionStorage:", error)
      sessionStorage.removeItem(this.SESSION_STORAGE_KEY)
    }
  }

  /**
   * Obtiene una foto desde sessionStorage
   */
  private getFromSessionStorage(userId: string): CachedPhoto | null {
    if (typeof window === "undefined") return null

    try {
      const stored = sessionStorage.getItem(this.SESSION_STORAGE_KEY)
      if (!stored) return null

      const parsed = JSON.parse(stored) as Record<string, CachedPhoto>
      const cached = parsed[userId]
      
      if (cached && !this.isExpired(cached)) {
        return cached
      }

      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Guarda una foto en sessionStorage
   */
  private saveToSessionStorage(userId: string, cached: CachedPhoto): void {
    if (typeof window === "undefined") return

    try {
      const stored = sessionStorage.getItem(this.SESSION_STORAGE_KEY)
      const parsed = stored ? JSON.parse(stored) : {}
      
      parsed[userId] = cached
      
      sessionStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(parsed))
    } catch (error) {
      logger?.warn?.("[PhotoCache] Error saving to sessionStorage (quota exceeded?):", error)
      // Si falla por quota, limpiar sessionStorage y reintentar
      sessionStorage.removeItem(this.SESSION_STORAGE_KEY)
    }
  }

  /**
   * Elimina una foto de sessionStorage
   */
  private removeFromSessionStorage(userId: string): void {
    if (typeof window === "undefined") return

    try {
      const stored = sessionStorage.getItem(this.SESSION_STORAGE_KEY)
      if (!stored) return

      const parsed = JSON.parse(stored)
      delete parsed[userId]
      
      sessionStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(parsed))
    } catch (error) {
      logger?.warn?.("[PhotoCache] Error removing from sessionStorage:", error)
    }
  }

  /**
   * Precarga fotos de usuarios (útil para listas)
   */
  async prefetchPhotos(userIds: string[]): Promise<void> {
    logger?.debug?.(`[PhotoCache] Prefetching ${userIds.length} photos`)
    
    // Cargar en paralelo pero con límite de concurrencia
    const BATCH_SIZE = 5
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE)
      await Promise.allSettled(batch.map(id => this.getPhoto(id)))
    }
  }
}

// Singleton instance
export const PhotoCache = new PhotoCacheManager()

// Exponer globalmente para debugging
if (typeof window !== "undefined") {
  (window as any).photoCache = PhotoCache
}
