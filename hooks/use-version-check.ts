"use client"

import { useEffect } from 'react'

/**
 * Hook para detectar nuevas versiones del frontend y forzar recarga automática
 * ⚡ OPTIMIZADO: Revisa cada 5 minutos (reducido de 2 minutos para performance)
 */
export function useVersionCheck() {
  useEffect(() => {
    // Solo ejecutar en producción
    if (process.env.NODE_ENV !== 'production') return

    let buildId: string | null = null
    
    const checkVersion = async () => {
      try {
        // Hacer request con cache-busting query param
        const response = await fetch(`/api/version?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        })
        
        if (!response.ok) return
        
        const data = await response.json()
        
        if (!buildId) {
          // Primera vez, solo guardar el build ID
          buildId = data.buildId
          console.log('[Version Check] Current build:', buildId)
          return
        }
        
        // Si el build ID cambió, hay una nueva versión
        if (buildId !== data.buildId) {
          console.log('[Version Check] New version detected! Reloading...')
          console.log(`Old: ${buildId}, New: ${data.buildId}`)
          
          // Limpiar todos los caches y recargar inmediatamente
          if ('caches' in window) {
            caches.keys().then((names) => {
              names.forEach((name) => {
                caches.delete(name)
              })
            })
          }
          
          // Forzar hard reload
          window.location.reload()
        }
      } catch (error) {
        console.error('[Version Check] Error checking version:', error)
      }
    }
    
    // ⚡ Revisar después de 10 segundos (no inmediatamente al cargar)
    const initialTimeoutId = setTimeout(checkVersion, 10000)
    
    // ⚡ Revisar cada 5 minutos (300000 ms) en lugar de 2 minutos
    // Menos requests = mejor performance
    const interval = setInterval(checkVersion, 300000)
    
    return () => {
      clearTimeout(initialTimeoutId)
      clearInterval(interval)
    }
  }, [])
}
