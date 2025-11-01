/// <reference types="google.maps" />
import { useEffect, useState } from "react"
import { logger } from "./logger"

type LoadOptions = {
  libraries?: Array<"places" | "geometry" | "visualization"> // Librerías a cargar con importLibrary()
  language?: string
  region?: string
  v?: string // Versión de Google Maps (ej: "beta", "quarterly", "weekly")
  channel?: string
  nonce?: string
  forceRetry?: boolean // si hubo error previo, vuelve a intentar
}

class GoogleMapsLoader {
  private loading = false
  private loaded = false
  private error: Error | null = null
  private scriptId = "google-maps-script"
  private pendingPromise: Promise<void> | null = null

  async load(opts: LoadOptions = {}): Promise<void> {
    const {
      libraries = ["places"],
      language = "es",
      region = "UY",
      v = "beta", // ⚡ BETA para asegurar importLibrary() disponible
      channel = "faltauno",
      nonce,
      forceRetry = false,
    } = opts

    // SSR guard
    if (typeof window === "undefined") {
      const err = new Error("Google Maps solo puede cargarse en el navegador")
      this.setError(err)
      throw err
    }

    // Si ya está cargado, listo
    if (this.loaded && this.isGoogleAvailable()) return

    // Si hubo error previo y no se fuerza reintento
    if (this.error && !forceRetry) {
      throw this.error
    }
    if (forceRetry) {
      // “desbloquear” estado de error para reintentar
      this.loading = false
      this.loaded = false
      this.error = null
      this.pendingPromise = null
      // Si existe un script previo, lo removemos para un fresh load
      const old = document.getElementById(this.scriptId)
      if (old?.parentNode) old.parentNode.removeChild(old)
    }

    // Si ya hay una promesa en curso, reutilizarla
    if (this.pendingPromise) return this.pendingPromise

    // Si google ya está disponible (inyectado por otra parte), marcar ok
    if (this.isGoogleAvailable()) {
      this.setLoaded()
      return
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      const err = new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY no está configurada")
      this.setError(err)
      throw err
    }

    // Si el script ya existe, esperar a que "aparezca" google.maps
    const existing = document.getElementById(this.scriptId) as HTMLScriptElement | null
    if (existing) {
      this.loading = true
      this.pendingPromise = this.waitForGoogle(15000) // ✅ Más tiempo: 15s
        .then(() => this.postLoadImports(libraries))
        .then(() => this.setLoaded())
        .catch((e) => this.setError(e))
      return this.pendingPromise
    }

    // ✅ 100% MODERNO: Solo loading=async, SIN libraries= en URL
    // Las libraries se cargan con importLibrary() después
    const params = `key=${encodeURIComponent(apiKey)}&loading=async&v=${encodeURIComponent(
      v
    )}&language=${encodeURIComponent(language)}&region=${encodeURIComponent(
      region
    )}&channel=${encodeURIComponent(channel)}`
    const src = `https://maps.googleapis.com/maps/api/js?${params}`

    const script = document.createElement("script")
    script.id = this.scriptId
    script.async = true
    script.defer = true
    script.src = src
    if (nonce) (script as any).nonce = nonce

    this.loading = true

    this.pendingPromise = new Promise<void>((resolve, reject) => {
      script.onload = async () => {
        try {
          logger.info?.("[GoogleMapsLoader] 📍 Script cargado, URL:", script.src)
          
          // ✅ Más tiempo para esperar google.maps
          await this.waitForGoogle(10000) // 10s en vez de 5s
          
          // 🔍 DEBUG: Verificar qué objetos existen en window.google
          const g = (window as any).google
          logger.info?.("[GoogleMapsLoader] 🔍 window.google existe:", !!g)
          logger.info?.("[GoogleMapsLoader] 🔍 window.google.maps existe:", !!g?.maps)
          logger.info?.("[GoogleMapsLoader] 🔍 window.google.maps.version:", g?.maps?.version)
          logger.info?.("[GoogleMapsLoader] 🔍 window.google.maps.importLibrary existe:", !!g?.maps?.importLibrary)
          logger.info?.("[GoogleMapsLoader] 🔍 Tipo de importLibrary:", typeof g?.maps?.importLibrary)
          
          // ✅ CRÍTICO: Cargar libraries de forma moderna
          await this.postLoadImports(libraries)
          
          this.setLoaded()
          resolve()
        } catch (e) {
          this.setError(e as Error)
          reject(e)
        }
      }
      script.onerror = (event) => {
        const err = new Error("Error al cargar el script de Google Maps")
        logger.error?.("[GoogleMapsLoader] onerror", event)
        this.setError(err)
        reject(err)
      }
    })

    document.head.appendChild(script)
    return this.pendingPromise
  }

  // Espera activa a que google.maps exista, con timeout
  private waitForGoogle(timeoutMs: number): Promise<void> {
    const started = performance.now()
    return new Promise<void>((resolve, reject) => {
      const tick = () => {
        if (this.isGoogleAvailable()) return resolve()
        if (performance.now() - started > timeoutMs) {
          return reject(new Error("Timeout esperando Google Maps"))
        }
        requestAnimationFrame(tick)
      }
      tick()
    })
  }

  // ✅ 100% MODERNO: Carga libraries con importLibrary() (requiere Google Maps v3.50+)
  private async postLoadImports(libraries: string[]): Promise<void> {
    const g = (window as any).google
    const anyMaps: any = g?.maps
    
    // 🔍 Buscar importLibrary en diferentes ubicaciones posibles
    const importLib = 
      anyMaps?.importLibrary ||           // Ubicación estándar
      g?.maps?.importLibrary ||           // Alternativa
      (window as any).importLibrary ||    // Global
      anyMaps?.loader?.importLibrary      // En loader object
    
    logger.info?.("[GoogleMapsLoader] 🔍 Buscando importLibrary...")
    logger.info?.("[GoogleMapsLoader] 🔍 google.maps.importLibrary:", !!anyMaps?.importLibrary)
    logger.info?.("[GoogleMapsLoader] 🔍 window.google.maps.importLibrary:", !!g?.maps?.importLibrary)
    logger.info?.("[GoogleMapsLoader] 🔍 window.importLibrary:", !!(window as any).importLibrary)
    logger.info?.("[GoogleMapsLoader] 🔍 google.maps.loader:", !!anyMaps?.loader)
    logger.info?.("[GoogleMapsLoader] 🔍 Todas las keys de google.maps:", Object.keys(anyMaps || {}))
    
    if (!importLib) {
      const err = new Error(
        `importLibrary no disponible en ninguna ubicación conocida.\n` +
        `Versión: ${anyMaps?.version || 'unknown'}\n` +
        `La API Key puede tener restricciones. Verifica en Google Cloud Console que NO tenga restricciones de versión.\n` +
        `Propiedades disponibles en google.maps: ${Object.keys(anyMaps || {}).join(', ')}`
      )
      logger.error?.("[GoogleMapsLoader] ❌ importLibrary no existe")
      logger.error?.("[GoogleMapsLoader] ❌ Versión actual:", anyMaps?.version)
      logger.error?.("[GoogleMapsLoader] ❌ Versión requerida: 3.50+")
      throw err
    }

    try {
      logger.debug?.("[GoogleMapsLoader] 🔄 Cargando libraries modernas:", libraries)
      logger.debug?.("[GoogleMapsLoader] 📍 Versión de Google Maps:", anyMaps.version)
      logger.debug?.("[GoogleMapsLoader] 🔧 Usando importLibrary desde:", 
        anyMaps?.importLibrary ? 'google.maps.importLibrary' :
        (window as any).importLibrary ? 'window.importLibrary' :
        anyMaps?.loader?.importLibrary ? 'google.maps.loader.importLibrary' : 'unknown'
      )
      
      // ✅ SIEMPRE cargar 'maps' primero (base)
      await importLib("maps")
      logger.debug?.("[GoogleMapsLoader] ✅ Library 'maps' cargada")
      
      // ✅ Cargar cada library solicitada
      for (const lib of libraries) {
        if (lib === "places") {
          await importLib("places")
          logger.debug?.("[GoogleMapsLoader] ✅ Library 'places' cargada")
          
          // ✅ VERIFICAR que Places esté disponible
          await this.waitForPlaces(10000) // Esperar hasta 10s
        }
        // Otros libraries si se agregan en el futuro
      }
      
      // ✅ Marker moderno (opcional pero recomendado)
      try {
        await importLib("marker")
        logger.debug?.("[GoogleMapsLoader] ✅ Library 'marker' cargada")
      } catch {
        logger.warn?.("[GoogleMapsLoader] ⚠️ Library 'marker' no disponible (opcional)")
      }
      
      logger.info?.("[GoogleMapsLoader] 🎉 Todas las libraries cargadas exitosamente")
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Error desconocido cargando libraries")
      logger.error?.("[GoogleMapsLoader] ❌ Error cargando libraries:", err)
      throw err
    }
  }

  // ✅ NUEVO: Esperar específicamente a que Places API esté disponible
  private waitForPlaces(timeoutMs: number): Promise<void> {
    const started = performance.now()
    return new Promise<void>((resolve, reject) => {
      const tick = () => {
        const maps = (window as any).google?.maps
        
        // ✅ Verificar que window.google.maps.places exista
        if (maps?.places) {
          logger.debug?.("[GoogleMapsLoader] ✅ Places API disponible")
          return resolve()
        }
        
        if (performance.now() - started > timeoutMs) {
          const err = new Error(`Timeout esperando Places API después de ${timeoutMs}ms`)
          logger.error?.("[GoogleMapsLoader] ❌ Timeout Places API")
          return reject(err)
        }
        
        requestAnimationFrame(tick)
      }
      tick()
    })
  }

  private setLoaded() {
    this.loaded = true
    this.loading = false
    this.error = null
    this.pendingPromise = null
    logger.debug?.("[GoogleMapsLoader] listo ✔")
  }

  private setError(err: Error) {
    this.error = err
    this.loaded = false
    this.loading = false
    this.pendingPromise = null
    logger.error?.("[GoogleMapsLoader] error:", err.message)
  }

  private isGoogleAvailable(): boolean {
    return typeof window !== "undefined" && !!(window as any).google?.maps
  }

  isLoaded(): boolean {
    return this.loaded && this.isGoogleAvailable()
  }
  getGoogle(): typeof google | null {
    return this.isGoogleAvailable() ? (window as any).google : null
  }
  getError(): Error | null {
    return this.error
  }

  // Reseteo seguro (tests)
  reset(): void {
    this.loading = false
    this.loaded = false
    this.error = null
    this.pendingPromise = null
    const s = document.getElementById(this.scriptId)
    if (s?.parentNode) s.parentNode.removeChild(s)
  }
}

export const googleMapsLoader = new GoogleMapsLoader()

/**
 * Hook React
 */
export function useGoogleMaps(options?: LoadOptions) {
  const [isLoaded, setIsLoaded] = useState(googleMapsLoader.isLoaded())
  const [error, setError] = useState<Error | null>(googleMapsLoader.getError())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    if (googleMapsLoader.isLoaded()) {
      setIsLoaded(true)
      setError(null)
      return
    }
    setIsLoading(true)
    googleMapsLoader
      .load(options)
      .then(() => {
        if (!mounted) return
        setIsLoaded(true)
        setError(null)
      })
      .catch((err) => {
        if (!mounted) return
        setIsLoaded(false)
        setError(err as Error)
      })
      .finally(() => mounted && setIsLoading(false))
    return () => {
      mounted = false
    }
  }, [options?.language, options?.region, options?.v]) // cambiar idioma/versión fuerza nuevo intento

  return {
    isLoaded,
    error,
    isLoading,
    google: googleMapsLoader.getGoogle(),
    reload: (force = true) => googleMapsLoader.load({ ...(options || {}), forceRetry: force }),
  }
}

// Tipado global
declare global {
  interface Window {
    google: typeof google
  }
}