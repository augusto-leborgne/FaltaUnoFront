"use client"

import { useVersionCheck } from '@/hooks/use-version-check'
import { useEffect, useState } from 'react'

/**
 * Banner de actualización al estilo de Facebook/Google
 * Aparece cuando hay nueva versión disponible
 * Usuario decide cuándo actualizar (mejor UX)
 */
export function UpdateBanner() {
  const { newVersionAvailable, reloadApp } = useVersionCheck()
  const [show, setShow] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // Prevenir hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])
  
  useEffect(() => {
    if (newVersionAvailable && mounted) {
      // Pequeño delay para que sea menos intrusivo
      setTimeout(() => setShow(true), 2000)
    }
  }, [newVersionAvailable, mounted])
  
  // No renderizar en SSR
  if (!mounted || !show) return null
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg animate-in slide-in-from-top duration-300">
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 py-2 xs:py-2.5 sm:py-3">
        <div className="flex items-center justify-between flex-wrap gap-2 xs:gap-3">
          <div className="flex items-center gap-2 xs:gap-3 min-w-0 flex-1">
            <div className="flex-shrink-0">
              <svg className="h-5 xs:h-5.5 sm:h-6 w-5 xs:w-5.5 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-xs xs:text-sm font-medium truncate">
              ✨ Nueva versión disponible con mejoras y correcciones
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 xs:gap-2 flex-shrink-0">
            <button
              onClick={() => setShow(false)}
              className="px-2 xs:px-3 py-1.5 text-xs xs:text-sm text-white hover:text-white/80 transition-colors rounded-lg min-h-[40px] xs:min-h-[44px] flex items-center"
            >
              Ahora no
            </button>
            <button
              onClick={reloadApp}
              className="px-3 xs:px-4 py-1.5 bg-white text-primary rounded-lg xs:rounded-xl text-xs xs:text-sm font-medium hover:bg-white/90 transition-colors shadow-sm min-h-[40px] xs:min-h-[44px] flex items-center whitespace-nowrap"
            >
              Actualizar ahora
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
