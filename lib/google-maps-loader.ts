/// <reference types="google.maps" />
import { useEffect, useState } from 'react';
import { logger } from './logger';

/**
 * Utilidad centralizada para cargar Google Maps API
 * Garantiza carga única y gestión de estado
 */

type GoogleMapsCallback = () => void;
type GoogleMapsErrorCallback = (error: Error) => void;

class GoogleMapsLoader {
  private loading = false;
  private loaded = false;
  private error: Error | null = null;
  private callbacks: GoogleMapsCallback[] = [];
  private errorCallbacks: GoogleMapsErrorCallback[] = [];
  private scriptId = 'google-maps-script';

  /**
   * Carga el script de Google Maps
   * @returns Promise que se resuelve cuando Google Maps está listo
   */
  async load(): Promise<void> {
    // Si ya está cargado, resolver inmediatamente
    if (this.loaded && this.isGoogleAvailable()) {
      return Promise.resolve();
    }

    // Si hubo error previo, rechazar
    if (this.error) {
      return Promise.reject(this.error);
    }

    // Si está cargando, esperar a que termine
    if (this.loading) {
      return new Promise<void>((resolve, reject) => {
        this.callbacks.push(resolve);
        this.errorCallbacks.push(reject);
      });
    }

    // Iniciar carga
    this.loading = true;

    return new Promise<void>((resolve, reject) => {
      // Verificar entorno
      if (typeof window === 'undefined') {
        const error = new Error('Google Maps solo puede cargarse en el navegador');
        this.handleError(error);
        reject(error);
        return;
      }

      // Verificar API key
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        const error = new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY no está configurada');
        logger.error('[GoogleMapsLoader]', error.message);
        this.handleError(error);
        reject(error);
        return;
      }

      // Si ya está disponible, marcar como cargado
      if (this.isGoogleAvailable()) {
        logger.debug('[GoogleMapsLoader] Google Maps ya estaba disponible');
        this.handleSuccess();
        resolve();
        return;
      }

      // Verificar si ya existe el script
      const existingScript = document.getElementById(this.scriptId) as HTMLScriptElement | null;
      if (existingScript) {
        logger.debug('[GoogleMapsLoader] Script ya existe, esperando carga...');
        
        const checkGoogleAvailable = setInterval(() => {
          if (this.isGoogleAvailable()) {
            clearInterval(checkGoogleAvailable);
            this.handleSuccess();
            resolve();
          }
        }, 100);

        // Timeout después de 10 segundos
        setTimeout(() => {
          clearInterval(checkGoogleAvailable);
          if (!this.loaded) {
            const error = new Error('Timeout esperando Google Maps');
            this.handleError(error);
            reject(error);
          }
        }, 10000);
        
        return;
      }

      // Crear script
      logger.debug('[GoogleMapsLoader] Creando script de Google Maps...');
      const script = document.createElement('script');
      script.id = this.scriptId;
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;

      script.onload = () => {
        logger.debug('[GoogleMapsLoader] Script cargado exitosamente');
        
        // Esperar a que google.maps esté disponible
        const checkGoogleAvailable = setInterval(() => {
          if (this.isGoogleAvailable()) {
            clearInterval(checkGoogleAvailable);
            this.handleSuccess();
            resolve();
          }
        }, 50);

        // Timeout después de 5 segundos
        setTimeout(() => {
          clearInterval(checkGoogleAvailable);
          if (!this.loaded) {
            const error = new Error('Google Maps no se inicializó correctamente');
            this.handleError(error);
            reject(error);
          }
        }, 5000);
      };

      script.onerror = (event) => {
        logger.error('[GoogleMapsLoader] Error cargando script:', event);
        const error = new Error('Error al cargar el script de Google Maps');
        this.handleError(error);
        reject(error);
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Maneja el éxito de la carga
   */
  private handleSuccess(): void {
    this.loaded = true;
    this.loading = false;
    this.error = null;

    // Resolver callbacks pendientes
    this.callbacks.forEach((cb) => cb());
    this.callbacks = [];
    this.errorCallbacks = [];
  }

  /**
   * Maneja errores de carga
   */
  private handleError(error: Error): void {
    this.error = error;
    this.loading = false;
    this.loaded = false;

    // Rechazar callbacks pendientes
    this.errorCallbacks.forEach((cb) => cb(error));
    this.callbacks = [];
    this.errorCallbacks = [];
  }

  /**
   * Verifica si Google Maps está disponible
   */
  private isGoogleAvailable(): boolean {
    return typeof window !== 'undefined' && 
           typeof window.google !== 'undefined' && 
           typeof window.google.maps !== 'undefined';
  }

  /**
   * Verifica si Google Maps está cargado
   */
  isLoaded(): boolean {
    return this.loaded && this.isGoogleAvailable();
  }

  /**
   * Obtiene la instancia de Google Maps (si está cargada)
   */
  getGoogle(): typeof google | null {
    return this.isGoogleAvailable() ? window.google : null;
  }

  /**
   * Obtiene el error (si lo hay)
   */
  getError(): Error | null {
    return this.error;
  }

  /**
   * Resetea el estado (útil para testing)
   */
  reset(): void {
    this.loading = false;
    this.loaded = false;
    this.error = null;
    this.callbacks = [];
    this.errorCallbacks = [];
  }
}

// Exportar instancia singleton
export const googleMapsLoader = new GoogleMapsLoader();

/**
 * Hook para usar en componentes React
 */
export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(googleMapsLoader.isLoaded());
  const [error, setError] = useState<Error | null>(googleMapsLoader.getError());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Si ya está cargado, no hacer nada
    if (googleMapsLoader.isLoaded()) {
      setIsLoaded(true);
      return;
    }

    setIsLoading(true);

    googleMapsLoader
      .load()
      .then(() => {
        if (mounted) {
          setIsLoaded(true);
          setError(null);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err);
          setIsLoaded(false);
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { 
    isLoaded, 
    error, 
    isLoading,
    google: googleMapsLoader.getGoogle() 
  };
}

// Declaración global de tipos
declare global {
  interface Window {
    google: typeof google;
  }
}