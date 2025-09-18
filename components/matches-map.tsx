"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BottomNavigation } from "@/components/bottom-navigation"
import { ArrowLeft, MapPin, List } from "lucide-react"
import { useRouter } from "next/navigation"

// Mock data for map markers
const mapMatches = [
  {
    id: 1,
    type: "Fútbol 7",
    time: "Hoy 20:00",
    location: "Centro Deportivo Sur",
    spotsLeft: 2,
    lat: -34.9011,
    lng: -56.1645,
  },
  {
    id: 2,
    type: "Fútbol 5",
    time: "Mañana 18:30",
    location: "Polideportivo Norte",
    spotsLeft: 1,
    lat: -34.8941,
    lng: -56.1662,
  },
]

export function MatchesMap() {
  const router = useRouter()
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  const handleBack = () => {
    router.back()
  }

  const handleMatchClick = (matchId: number) => {
    router.push(`/matches/${matchId}`)
  }

  const handleListView = () => {
    router.push("/matches")
  }

  useEffect(() => {
    const loadGoogleMaps = () => {
      if (typeof window !== "undefined" && !window.google) {
        const script = document.createElement("script")
        script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places`
        script.async = true
        script.defer = true
        script.onload = () => setMapLoaded(true)
        document.head.appendChild(script)
      } else if (window.google) {
        setMapLoaded(true)
      }
    }

    loadGoogleMaps()
  }, [])

  useEffect(() => {
    if (mapLoaded && typeof window !== "undefined" && window.google) {
      const mapElement = document.getElementById("google-map")
      if (mapElement) {
        const map = new window.google.maps.Map(mapElement, {
          center: { lat: -34.9011, lng: -56.1645 }, // Montevideo center
          zoom: 13,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        })

        // Add markers for each match
        mapMatches.forEach((match) => {
          const marker = new window.google.maps.Marker({
            position: { lat: match.lat, lng: match.lng },
            map: map,
            title: match.location,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: "#16a34a",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
            label: {
              text: match.spotsLeft.toString(),
              color: "white",
              fontSize: "12px",
              fontWeight: "bold",
            },
          })

          marker.addListener("click", () => {
            setSelectedMatch(match.id)
          })
        })
      }
    }
  }, [mapLoaded])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={handleBack} className="p-2 -ml-2 touch-manipulation">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Mapa de Partidos</h1>
          </div>
          <Button
            onClick={handleListView}
            size="sm"
            variant="outline"
            className="border-gray-300 touch-manipulation bg-transparent"
          >
            <List className="w-4 h-4 mr-2" />
            Lista
          </Button>
        </div>
      </div>

      <div className="flex-1 relative">
        <div id="google-map" className="absolute inset-0 w-full h-full" style={{ minHeight: "400px" }}>
          {/* Fallback content while Google Maps loads */}
          {!mapLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Cargando mapa...</p>
                <p className="text-sm text-gray-500">Conectando con Google Maps</p>
              </div>
            </div>
          )}
        </div>

        {/* Match Details Popup */}
        {selectedMatch && (
          <div className="absolute bottom-24 left-4 right-4">
            {mapMatches
              .filter((match) => match.id === selectedMatch)
              .map((match) => (
                <div key={match.id} className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">{match.type}</Badge>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Quedan {match.spotsLeft}</Badge>
                    </div>
                    <button
                      onClick={() => setSelectedMatch(null)}
                      className="text-gray-400 hover:text-gray-600 p-1 touch-manipulation"
                    >
                      ✕
                    </button>
                  </div>

                  <h3 className="font-bold text-gray-900 mb-1">{match.time}</h3>
                  <p className="text-sm text-gray-600 mb-4">{match.location}</p>

                  <Button
                    onClick={() => handleMatchClick(match.id)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl"
                  >
                    Ver detalles
                  </Button>
                </div>
              ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}

declare global {
  interface Window {
    google: any
  }
}
