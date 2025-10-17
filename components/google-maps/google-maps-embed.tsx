/// <reference types="google.maps" />
"use client";

import { useEffect, useRef } from "react";
import { googleMapsLoader } from "@/lib/google-maps-loader";

interface GoogleMapsEmbedProps {
  lat: number;
  lng: number;
  zoom?: number;
  width?: string;
  height?: string;
  className?: string;
  markers?: Array<{
    lat: number;
    lng: number;
    title?: string;
    info?: string;
  }>;
}

export function GoogleMapsEmbed({
  lat,
  lng,
  zoom = 15,
  width = "100%",
  height = "200px",
  className = "",
  markers = [],
}: GoogleMapsEmbedProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    googleMapsLoader
      .load()
      .then(() => {
        if (!mounted) return;
        if (mapRef.current && window.google) {
          const map = new google.maps.Map(mapRef.current, {
            center: { lat, lng },
            zoom,
            styles: [
              {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }],
              },
            ],
          });

          markers.forEach((marker) => {
            const mapMarker = new google.maps.Marker({
              position: { lat: marker.lat, lng: marker.lng },
              map,
              title: marker.title || "",
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: "#16a34a",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2,
              },
            });

            if (marker.info) {
              const infoWindow = new google.maps.InfoWindow({
                content: marker.info,
              });

              mapMarker.addListener("click", () => {
                infoWindow.open(map, mapMarker);
              });
            }
          });
        }
      })
      .catch((err) => {
        console.error("Google Maps failed to load:", err);
      });

    return () => {
      mounted = false;
    };
  }, [lat, lng, zoom, markers]);

  return (
    <div ref={mapRef} className={`rounded-lg overflow-hidden ${className}`} style={{ width, height }}>
      <div className="w-full h-full bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Cargando mapa...</p>
        </div>
      </div>
    </div>
  );
}