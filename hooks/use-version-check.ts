"use client"

import { useEffect, useState } from 'react'
import { logger } from '@/lib/logger'

/**
 * Hook para detectar nuevas versiones del frontend
 * ✅ ESTÁNDAR DE LA INDUSTRIA:
 * - No fuerza reload automático (mala UX)
 * - Notifica al usuario con toast/banner
 * - Usuario decide cuándo actualizar
 * - Usa sessionStorage (se limpia al cerrar pestaña)
 */
export function useVersionCheck() {
  const [newVersionAvailable, setNewVersionAvailable] = useState(false)
  
  useEffect(() => {
    // Solo ejecutar en producción
    if (process.env.NODE_ENV !== 'production') return

    let currentBuildId: string | null = null
    
    const checkVersion = async () => {
      try {
        // Request con cache-busting
        const response = await fetch(`/api/version?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        })
        
        if (!response.ok) return
        
        const data = await response.json()
        
        // Primera vez: solo guardar el build ID
        if (!currentBuildId) {
          currentBuildId = data.buildId
          sessionStorage.setItem('app_buildId', data.buildId)
          logger.info('[Version Check] Current build:', currentBuildId)
          return
        }
        
        // Si el build ID cambió, hay nueva versión
        if (currentBuildId !== data.buildId) {
          logger.info('[Version Check] 🎉 Nueva versión disponible!')
          logger.info(`[Version Check] Old: ${currentBuildId}, New: ${data.buildId}`)
          
          setNewVersionAvailable(true)
          
          // Guardar en sessionStorage para persistir durante la sesión
          sessionStorage.setItem('app_newVersion', data.buildId)
          
          // ✅ ESTÁNDAR: No forzar reload, solo notificar
          // El usuario verá un banner/toast y decidirá cuándo actualizar
        }
      } catch (error) {
        logger.error('[Version Check] Error checking version:', error)
      }
    }
    
    // Verificar después de 30 segundos (no inmediatamente)
    const initialTimeoutId = setTimeout(checkVersion, 30000)
    
    // Verificar cada 5 minutos (estándar de la industria)
    const interval = setInterval(checkVersion, 300000)
    
    return () => {
      clearTimeout(initialTimeoutId)
      clearInterval(interval)
    }
  }, [])
  
  // Función para que el usuario actualice cuando quiera
  const reloadApp = () => {
    logger.info('[Version Check] Usuario solicitó actualización')
    
    // Limpiar caches antes de reload (opcional pero recomendado)
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name))
      })
    }
    
    // Hard reload para asegurar contenido fresco
    window.location.reload()
  }
  
  return { newVersionAvailable, reloadApp }
}
