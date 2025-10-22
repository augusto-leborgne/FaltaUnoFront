"use client"
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, MapPin } from "lucide-react";
import { useGoogleMaps } from "@/lib/google-maps-loader"; // adjust path

type MapMatch = {
  id: number;
  type: string;
  time: string;
  location: string;
  spotsLeft: number;
  lat: number;
  lng: number;
  price?: number;
};

const mapMatches: MapMatch[] = [
  { id: 1, type: "Fútbol 7", time: "Hoy 20:00", location: "Centro Deportivo Sur", spotsLeft: 2, lat: -34.9011, lng: -56.1645, price: 9 },
  { id: 2, type: "Fútbol 5", time: "Mañana 18:30", location: "Polideportivo Norte", spotsLeft: 1, lat: -34.8941, lng: -56.1662, price: 7 },
];

interface MatchesMapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MatchesMapModal({ isOpen, onClose }: MatchesMapModalProps) {
  const { isLoaded, error, google } = useGoogleMaps();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MapMatch | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (!isLoaded || !google) return;
    if (!mapRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: -34.9011, lng: -56.1645 },
      zoom: 13,
      styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
      disableDefaultUI: true,
    });
    mapInstanceRef.current = map;

    // create markers
    markersRef.current = mapMatches.map((m) => {
      const marker = new google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map,
        title: m.location,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#16a34a",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        label: {
          text: String(m.spotsLeft),
          color: "white",
          fontSize: "12px",
          fontWeight: "bold",
        } as unknown as google.maps.MarkerLabel, // cast for strict typings
      });

      marker.addListener("click", () => {
        setSelectedMatch(m);
      });

      return marker;
    });

    return () => {
      // cleanup markers
      markersRef.current.forEach((mk) => mk.setMap(null));
      markersRef.current = [];
      mapInstanceRef.current = null;
      setSelectedMatch(null);
    };
  }, [isOpen, isLoaded, google]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Mapa de Partidos</h2>
          <Button onClick={onClose} size="sm" variant="ghost" className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 relative">
          <div ref={mapRef} className="absolute inset-0 w-full h-full">
            {!isLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Cargando mapa...</p>
                  <p className="text-sm text-gray-500">Conectando con Google Maps</p>
                </div>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-red-600">Error cargando mapa: {error.message}</p>
              </div>
            )}
          </div>

          {selectedMatch && (
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">{selectedMatch.type}</Badge>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Quedan {selectedMatch.spotsLeft}</Badge>
                  </div>
                  <button onClick={() => setSelectedMatch(null)} className="text-gray-400 hover:text-gray-600 p-1">
                    ✕
                  </button>
                </div>

                <h3 className="font-bold text-gray-900 mb-1">{selectedMatch.time}</h3>
                <p className="text-sm text-gray-600 mb-2">{selectedMatch.location}</p>
                <p className="text-sm text-gray-600 mb-4">${selectedMatch.price ?? "---"} por jugador</p>

                <Button
                  onClick={() => {
                    onClose();
                    window.location.href = `/matches/${selectedMatch.id}`;
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl"
                >
                  Ver detalles del partido
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}