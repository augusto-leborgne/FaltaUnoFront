/**
 * ⚡ Data Prefetching System
 * Preloads common data to improve perceived performance
 */

import { PartidoAPI } from './api'
import { apiCache } from './api-cache'

/**
 * Precarga datos comunes de la aplicación
 */
export async function prefetchCommonData() {
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
