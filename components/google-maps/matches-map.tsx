"use client"
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { ArrowLeft, MapPin, List } from "lucide-react";
import { useRouter } from "next/navigation";
import { useGoogleMaps } from "@/lib/google-maps-loader";
import { useAuth } from "@/hooks/use-auth";

const mapMatches = [
  { id: 1, type: "Fútbol 7", time: "Hoy 20:00", location: "Centro Deportivo Sur", spotsLeft: 2, lat: -34.9011, lng: -56.1645, organizadorId: "user123" },
  { id: 2, type: "Fútbol 5", time: "Mañana 18:30", location: "Polideportivo Norte", spotsLeft: 1, lat: -34.8941, lng: -56.1662, organizadorId: "user456" },
];

export function MatchesMap() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { isLoaded, error, google } = useGoogleMaps();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  // Obtener ubicación del usuario al cargar
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          console.error("Error obteniendo ubicación:", err);
          // Fallback a Montevideo por defecto
          setUserLocation({ lat: -34.9011, lng: -56.1645 });
        }
      );
    } else {
      // No soporta geolocalización, usar default
      setUserLocation({ lat: -34.9011, lng: -56.1645 });
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !google) return;
    if (!mapRef.current || !userLocation) return;

    const map = new google.maps.Map(mapRef.current, {
      center: userLocation,
      zoom: 14, // Zoom apropiado para nivel de ciudad (nunca más amplio)
      disableDefaultUI: true,
      mapId: "falta-uno-map", // Requerido para AdvancedMarkerElement
    });
    mapInstanceRef.current = map;

    markersRef.current = mapMatches.map((m) => {
      // Crear contenido del marker
      const pinColor = m.spotsLeft === 0 ? '#ef4444' : m.spotsLeft <= 3 ? '#f59e0b' : '#16a34a'
      const markerContent = document.createElement("div");
      markerContent.className = "advanced-marker";
      markerContent.innerHTML = `
        <div style="
          position: relative;
          cursor: pointer;
        ">
          <!-- Pin principal -->
          <div style="
            background-color: ${pinColor};
            width: 36px;
            height: 36px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            transition: all 0.3s ease;
          ">
            <!-- Ícono de fútbol -->
            <div style="
              transform: rotate(45deg);
              color: white;
              font-size: 16px;
              font-weight: bold;
              text-shadow: 0 1px 3px rgba(0,0,0,0.3);
            ">
              ⚽
            </div>
          </div>
          <!-- Sombra del pin -->
          <div style="
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 12px;
            height: 4px;
            background: rgba(0,0,0,0.2);
            border-radius: 50%;
            filter: blur(2px);
          "></div>
        </div>
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
      markersRef.current.forEach((mk) => mk.map = null);
      markersRef.current = [];
      mapInstanceRef.current = null;
      setSelectedMatch(null);
    };
  }, [isLoaded, google, userLocation]);

  const handleBack = () => router.back();
  
  const handleMatchClick = (matchId: number) => {
    const match = mapMatches.find(m => m.id === matchId);
    if (!match) return;
    
    // Si el usuario es el organizador, ir a página de gestión
    if (user && match.organizadorId === user.id) {
      router.push(`/my-matches/${matchId}`);
    } else {
      // Si no es organizador, ir a página de detalles
      router.push(`/matches/${matchId}`);
    }
  };
  
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