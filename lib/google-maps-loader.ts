/// <reference types="google.maps" />
import * as React from 'react';

/**
 * Utilidad centralizada para cargar Google Maps API
 * Garantiza que el script se cargue una sola vez y gestiona el estado de carga
 */

type GoogleMapsCallback = () => void;

class GoogleMapsLoader {
  private loading = false;
  private loaded = false;
  private callbacks: GoogleMapsCallback[] = [];
  private scriptId = 'google-maps-script';

  /**
   * Carga el script de Google Maps
   * @returns Promise que se resuelve cuando Google Maps está listo
   */
  async load(): Promise<void> {
    // Si ya está cargado, resolver inmediatamente
    if (this.loaded && typeof window !== 'undefined' && window.google?.maps) {
      return Promise.resolve();
    }

    // Si está cargando, esperar a que termine
    if (this.loading) {
      return new Promise<void>((resolve) => {
        this.callbacks.push(resolve);
      });
    }

    // Iniciar carga
    this.loading = true;

    return new Promise<void>((resolve, reject) => {
      // Verificar API key
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        const error = new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY no está configurada');
        console.error(error);
        this.loading = false;
        reject(error);
        return;
      }

      // Si ya existe y google.maps ya está disponible, marcamos como cargado
      if (typeof window !== 'undefined' && window.google?.maps) {
        this.loaded = true;
        this.loading = false;
        this.callbacks.forEach((cb) => cb());
        this.callbacks = [];
        resolve();
        return;
      }

      // Verificar si ya existe el script (evitar duplicados)
      const existingScript = document.getElementById(this.scriptId) as HTMLScriptElement | null;
      if (existingScript) {
        // Si el script existe pero google aún no está listo, nos suscribimos al evento load/error
        const onLoadHandler = () => {
          existingScript.removeEventListener('load', onLoadHandler);
          existingScript.removeEventListener('error', onErrorHandler);
          this.loaded = true;
          this.loading = false;
          this.callbacks.forEach((cb) => cb());
          this.callbacks = [];
          resolve();
        };
        const onErrorHandler = (ev: Event | string | null) => {
          existingScript.removeEventListener('load', onLoadHandler);
          existingScript.removeEventListener('error', onErrorHandler);
          this.loading = false;
          const err = new Error('Error cargando Google Maps API (script existente).');
          console.error(err, ev);
          reject(err);
        };

        existingScript.addEventListener('load', onLoadHandler);
        existingScript.addEventListener('error', onErrorHandler);
        return;
      }

      // Crear script
      const script = document.createElement('script');
      script.id = this.scriptId;
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;

      script.onload = () => {
        this.loaded = true;
        this.loading = false;

        // Resolver callbacks pendientes
        this.callbacks.forEach((cb) => cb());
        this.callbacks = [];

        resolve();
      };

      script.onerror = (error) => {
        this.loading = false;
        const err = new Error('Error cargando Google Maps API');
        console.error(err, error);
        reject(err);
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Verifica si Google Maps está cargado
   */
  isLoaded(): boolean {
    return this.loaded && typeof window !== 'undefined' && !!window.google?.maps;
  }

  /**
   * Obtiene la instancia de Google Maps (si está cargada)
   */
  getGoogle(): typeof google | null {
    return this.isLoaded() ? (window.google as typeof google) : null;
  }
}

// Exportar instancia singleton
export const googleMapsLoader = new GoogleMapsLoader();

/**
 * Hook para usar en componentes React
 *
 * Devuelve:
 *  - isLoaded: boolean
 *  - error: Error | null
 *  - google: typeof google | null
 */
export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let mounted = true;

    googleMapsLoader
      .load()
      .then(() => {
        if (mounted) setIsLoaded(true);
      })
      .catch((err) => {
        if (mounted) setError(err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { isLoaded, error, google: googleMapsLoader.getGoogle() };
}