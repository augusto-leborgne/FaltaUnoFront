"use client"
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { ArrowLeft, MapPin, List } from "lucide-react";
import { useRouter } from "next/navigation";
import { useGoogleMaps } from "@/lib/google-maps-loader"; // adjust path

const mapMatches = [
  { id: 1, type: "Fútbol 7", time: "Hoy 20:00", location: "Centro Deportivo Sur", spotsLeft: 2, lat: -34.9011, lng: -56.1645 },
  { id: 2, type: "Fútbol 5", time: "Mañana 18:30", location: "Polideportivo Norte", spotsLeft: 1, lat: -34.8941, lng: -56.1662 },
];

export function MatchesMap() {
  const router = useRouter();
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const { isLoaded, error, google } = useGoogleMaps();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    if (!isLoaded || !google) return;
    if (!mapRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: -34.9011, lng: -56.1645 },
      zoom: 13,
      styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
      disableDefaultUI: true,
      mapId: "falta-uno-map", // Requerido para AdvancedMarkerElement
    });
    mapInstanceRef.current = map;

    markersRef.current = mapMatches.map((m) => {
      // Crear contenido del marker
      const markerContent = document.createElement("div");
      markerContent.className = "advanced-marker";
      markerContent.innerHTML = `
        <div style="
          width: 32px;
          height: 32px;
          background-color: #16a34a;
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: bold;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ">${m.spotsLeft}</div>
      `;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: m.lat, lng: m.lng },
        map,
        title: m.location,
        content: markerContent,
      });

      marker.addListener("click", () => {
        setSelectedMatch(m.id);
      });

      return marker;
    });

    return () => {
      markersRef.current.forEach((mk) => mk.setMap(null));
      markersRef.current = [];
      mapInstanceRef.current = null;
      setSelectedMatch(null);
    };
  }, [isLoaded, google]);

  const handleBack = () => router.back();
  const handleMatchClick = (matchId: number) => router.push(`/matches/${matchId}`);
  const handleListView = () => router.push("/matches");

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={handleBack} className="p-2 -ml-2">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Mapa de Partidos</h1>
          </div>
          <Button onClick={handleListView} size="sm" variant="outline" className="border-gray-300 bg-transparent">
            <List className="w-4 h-4 mr-2" />
            Lista
          </Button>
        </div>
      </div>

      <div className="flex-1 relative">
        <div ref={mapRef} id="google-map" className="absolute inset-0 w-full h-full" style={{ minHeight: "400px" }}>
          {!isLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Cargando mapa...</p>
                <p className="text-sm text-gray-500">Conectando con Google Maps</p>
              </div>
            </div>
          )}
          {error && <div className="absolute inset-0 flex items-center justify-center"><p className="text-sm text-red-600">Error cargando mapa: {error.message}</p></div>}
        </div>

        {selectedMatch && (
          <div className="absolute bottom-24 left-4 right-4">
            {mapMatches.filter((m) => m.id === selectedMatch).map((match) => (
              <div key={match.id} className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-orange-100 text-gray-800">{match.type}</Badge>
                    <Badge className="bg-green-100 text-green-800">Quedan {match.spotsLeft}</Badge>
                  </div>
                  <button onClick={() => setSelectedMatch(null)} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
                </div>

                <h3 className="font-bold text-gray-900 mb-1">{match.time}</h3>
                <p className="text-sm text-gray-600 mb-4">{match.location}</p>

                <Button onClick={() => handleMatchClick(match.id)} className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl">
                  Ver detalles
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}

declare global {
  interface Window {
    google: typeof google;
  }
}