"use client"
import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, ExternalLink } from "lucide-react";
import { useGoogleMaps } from "@/lib/google-maps-loader"; // adjust path

interface GoogleMapsModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: string;
  lat: number;
  lng: number;
}

export function GoogleMapsModal({ isOpen, onClose, location, lat, lng }: GoogleMapsModalProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const { isLoaded, error, google } = useGoogleMaps();

  useEffect(() => {
    if (!isOpen) return;

    if (!isLoaded) return; // loader will set isLoaded when ready
    if (!google || !mapRef.current) return;

    // If already initialized and same center, reposition instead of recreating
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setCenter({ lat, lng });
      markerRef.current.setPosition({ lat, lng });
      return;
    }

    const map = new google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: 16,
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
      ],
      disableDefaultUI: true,
    });
    mapInstanceRef.current = map;

    const marker = new google.maps.Marker({
      position: { lat, lng },
      map,
      title: location,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: "#16a34a",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
    });
    markerRef.current = marker;

    return () => {
      // cleanup map + marker listeners
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      if (mapInstanceRef.current) {
        // Remove listeners attached to the map if any (none here)
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, isLoaded, google, lat, lng, location]);

  const handleOpenGoogleMaps = () => {
    window.open(`https://maps.google.com/?q=${lat},${lng}`, "_blank");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Ubicación</h2>
            <p className="text-sm text-gray-600">{location}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleOpenGoogleMaps} variant="outline" size="sm" className="bg-transparent">
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir en Google Maps
            </Button>
            <Button onClick={onClose} variant="outline" size="sm" className="bg-transparent p-2">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 relative">
          <div ref={mapRef} className="absolute inset-0 w-full h-full">
            {!isLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Cargando Google Maps...</p>
                </div>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-red-600">Error cargando mapa: {error.message}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}