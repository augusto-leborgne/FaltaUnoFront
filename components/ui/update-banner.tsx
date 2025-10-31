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
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg animate-in slide-in-from-top duration-300">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-sm font-medium">
              ✨ Nueva versión disponible con mejoras y correcciones
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShow(false)}
              className="px-3 py-1.5 text-sm text-white hover:text-blue-100 transition-colors"
            >
              Ahora no
            </button>
            <button
              onClick={reloadApp}
              className="px-4 py-1.5 bg-white text-blue-600 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors shadow-sm"
            >
              Actualizar ahora
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
