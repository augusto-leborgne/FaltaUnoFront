// lib/google-maps-loader.ts

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
    if (this.loaded && window.google?.maps) {
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

      // Verificar si ya existe el script
      const existingScript = document.getElementById(this.scriptId);
      if (existingScript) {
        existingScript.remove();
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
        this.callbacks.forEach(cb => cb());
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
    return this.loaded && !!window.google?.maps;
  }

  /**
   * Obtiene la instancia de Google Maps (si está cargada)
   */
  getGoogle(): typeof google | null {
    return this.isLoaded() ? window.google : null;
  }
}

// Exportar instancia singleton
export const googleMapsLoader = new GoogleMapsLoader();

// Hook para usar en componentes React
export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    googleMapsLoader
      .load()
      .then(() => setIsLoaded(true))
      .catch(err => setError(err));
  }, []);

  return { isLoaded, error, google: googleMapsLoader.getGoogle() };


import * as React from 'react';