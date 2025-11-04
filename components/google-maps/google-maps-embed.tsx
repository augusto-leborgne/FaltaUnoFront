/// <reference types="google.maps" />
"use client";

import { useEffect, useRef, useState } from "react";
import { googleMapsLoader } from "@/lib/google-maps-loader";
import { MapPin, AlertCircle } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface Marker {
  lat: number;
  lng: number;
  title?: string;
  info?: string;
}

interface GoogleMapsEmbedProps {
  lat: number;
  lng: number;
  zoom?: number;
  width?: string;
  height?: string;
  className?: string;
  markers?: Marker[];
  interactive?: boolean;
}

export function GoogleMapsEmbed({
  lat,
  lng,
  zoom = 15,
  width = "100%",
  height = "200px",
  className = "",
  markers = [],
  interactive = true,
}: GoogleMapsEmbedProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Limpiar marcadores existentes
    const cleanupMarkers = () => {
      markersRef.current.forEach(marker => marker.map = null);
      markersRef.current = [];
    };

    // Inicializar mapa
    const initializeMap = async () => {
      try {
        setIsLoading(true);
        setError(null);

        await googleMapsLoader.load();

        if (!mounted) return;

        if (!mapRef.current) {
          throw new Error("Referencia del mapa no disponible");
        }

        if (!window.google?.maps) {
          throw new Error("Google Maps no está disponible");
        }

        // Crear mapa
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat, lng },
          zoom,
          gestureHandling: interactive ? 'auto' : 'none',
          zoomControl: interactive,
          mapTypeControl: false,
          scaleControl: false,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: false,
          mapId: "google-maps-embed", // Requerido para AdvancedMarkerElement
        });

        mapInstanceRef.current = map;

        // Agregar marcadores
        const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

        // Si no hay marcadores custom, agregar uno en el centro
        const markersList = markers.length > 0 ? markers : [{ lat, lng, title: "Ubicación" }];

        markersList.forEach((markerData) => {
          // Crear contenido HTML del marker con estilo de pin
          const markerContent = document.createElement("div")
          markerContent.innerHTML = `
            <div style="
              position: relative;
              cursor: pointer;
            ">
              <!-- Pin simple para embed -->
              <div style="
                background-color: #16a34a;
                width: 28px;
                height: 28px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 3px solid white;
                box-shadow: 0 3px 8px rgba(0,0,0,0.35);
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <div style="
                  transform: rotate(45deg);
                  color: white;
                  font-size: 14px;
                  font-weight: bold;
                ">⚽</div>
              </div>
              <!-- Sombra -->
              <div style="
                position: absolute;
                bottom: -6px;
                left: 50%;
                transform: translateX(-50%);
                width: 10px;
                height: 3px;
                background: rgba(0,0,0,0.2);
                border-radius: 50%;
                filter: blur(1px);
              "></div>
            </div>
          `

          const marker = new window.google.maps.marker.AdvancedMarkerElement({
            position: { lat: markerData.lat, lng: markerData.lng },
            map,
            content: markerContent,
            title: markerData.title || "",
          });

          // Info window si hay info
          if (markerData.info) {
            const infoWindow = new window.google.maps.InfoWindow({
              content: `<div style="padding: 8px; font-family: sans-serif;">
                <strong>${markerData.title || 'Ubicación'}</strong>
                <p style="margin: 4px 0 0 0; font-size: 14px;">${markerData.info}</p>
              </div>`,
            });

            marker.addListener("click", () => {
              infoWindow.open(map, marker);
            });
          }

          newMarkers.push(marker);
        });

        markersRef.current = newMarkers;

        // Ajustar vista si hay múltiples marcadores
        if (newMarkers.length > 1) {
          const bounds = new window.google.maps.LatLngBounds();
          newMarkers.forEach(marker => {
            const position = marker.position as google.maps.LatLngLiteral;
            if (position) bounds.extend(position);
          });
          map.fitBounds(bounds);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("❌ [GoogleMapsEmbed] Error inicializando mapa:", err);
        if (mounted) {
          setError(err instanceof Error ? err.message : "Error al cargar el mapa");
          setIsLoading(false);
        }
      }
    };

    initializeMap();

    return () => {
      mounted = false;
      cleanupMarkers();
    };
  }, [lat, lng, zoom, markers, interactive]);

  // Actualizar centro si cambian las coordenadas
  useEffect(() => {
    if (mapInstanceRef.current && !isLoading) {
      mapInstanceRef.current.setCenter({ lat, lng });
    }
  }, [lat, lng, isLoading]);

  // Render loading
  if (isLoading) {
    return (
      <div
        className={`rounded-lg overflow-hidden ${className}`}
        style={{ width, height }}
      >
        <div className="w-full h-full bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
          <LoadingSpinner size="md" variant="green" text="Cargando mapa..." />
        </div>
      </div>
    );
  }

  // Render error
  if (error) {
    return (
      <div
        className={`rounded-lg overflow-hidden ${className}`}
        style={{ width, height }}
      >
        <div className="w-full h-full bg-red-50 border border-red-200 flex items-center justify-center">
          <div className="text-center px-4">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600 font-medium">Error al cargar el mapa</p>
            <p className="text-xs text-red-500 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Render mapa
  return (
    <div
      ref={mapRef}
      className={`rounded-lg overflow-hidden ${className}`}
      style={{ width, height }}
    />
  );
}