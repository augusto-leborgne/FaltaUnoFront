/// <reference types="google.maps" />
import { useEffect, useState } from "react"
import { logger } from "./logger"

type LoadOptions = {
  libraries?: Array<"places" | "geometry" | "visualization"> // módulos clásicos via ?libraries=
  language?: string
  region?: string
  v?: string // ej: "weekly"
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
      v = "weekly",
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

    // Si el script ya existe, esperar a que “aparezca” google.maps
    const existing = document.getElementById(this.scriptId) as HTMLScriptElement | null
    if (existing) {
      this.loading = true
      this.pendingPromise = this.waitForGoogle(10000)
        .then(() => this.postLoadImports(libraries))
        .then(() => this.setLoaded())
        .catch((e) => this.setError(e))
      return this.pendingPromise
    }

    // Inyección del script una sola vez
    const libsParam = libraries.length ? `&libraries=${libraries.join(",")}` : ""
    const params = `key=${encodeURIComponent(apiKey)}&loading=async&v=${encodeURIComponent(
      v
    )}${libsParam}&language=${encodeURIComponent(language)}&region=${encodeURIComponent(
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
          await this.waitForGoogle(5000)
          await this.postLoadImports(libraries) // carga moderna de módulos si está disponible
          this.setLoaded()
          resolve()
        } catch (e) {
          this.setError(e as Error)
          reject(e)
        }
      }
      script.onerror = (event) => {
        const err = new Error("Error al cargar el script de Google Maps")
        // Log extendido pero NUNCA la API key
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

  // Importa módulos modernos si existe google.maps.importLibrary (v3.49+)
  private async postLoadImports(libraries: string[]) {
    try {
      const anyMaps: any = (window as any).google?.maps
      if (!anyMaps?.importLibrary) return
      // Siempre asegurar 'maps' base
      await anyMaps.importLibrary("maps")
      // Módulos equivalentes a los clásicos libraries
      // places -> importLibrary('places'); marker se usa para Marker avanzado
      for (const lib of libraries) {
        if (lib === "places") {
          await anyMaps.importLibrary("places")
        }
      }
      // Marker moderno (si lo usás)
      try {
        await anyMaps.importLibrary("marker")
      } catch {
        /* opcional */
      }
    } catch (e) {
      // No es fatal: si falla importLibrary, aún podemos usar la API clásica
      logger.warn?.("[GoogleMapsLoader] importLibrary falló (no bloqueante)", e)
    }
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