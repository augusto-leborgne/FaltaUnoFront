"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, MapPin } from "lucide-react"

// Mock data for map markers with match locations
const mapMatches = [
  {
    id: 1,
    type: "Fútbol 7",
    time: "Hoy 20:00",
    location: "Centro Deportivo Sur",
    spotsLeft: 2,
    lat: -34.9011,
    lng: -56.1645,
    price: 9,
  },
  {
    id: 2,
    type: "Fútbol 5",
    time: "Mañana 18:30",
    location: "Polideportivo Norte",
    spotsLeft: 1,
    lat: -34.8941,
    lng: -56.1662,
    price: 7,
  },
]

interface MatchesMapModalProps {
  isOpen: boolean
  onClose: () => void
}

export function MatchesMapModal({ isOpen, onClose }: MatchesMapModalProps) {
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen])

  useEffect(() => {
    if (mapLoaded && isOpen && typeof window !== "undefined" && window.google) {
      const mapElement = document.getElementById("modal-google-map")
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
  }, [mapLoaded, isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Mapa de Partidos</h2>
          <Button onClick={onClose} size="sm" variant="ghost" className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <div id="modal-google-map" className="absolute inset-0 w-full h-full">
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
            <div className="absolute bottom-4 left-4 right-4">
              {mapMatches
                .filter((match) => match.id === selectedMatch)
                .map((match) => (
                  <div key={match.id} className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">{match.type}</Badge>
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          Quedan {match.spotsLeft}
                        </Badge>
                      </div>
                      <button
                        onClick={() => setSelectedMatch(null)}
                        className="text-gray-400 hover:text-gray-600 p-1 touch-manipulation"
                      >
                        ✕
                      </button>
                    </div>

                    <h3 className="font-bold text-gray-900 mb-1">{match.time}</h3>
                    <p className="text-sm text-gray-600 mb-2">{match.location}</p>
                    <p className="text-sm text-gray-600 mb-4">${match.price} por jugador</p>

                    <Button
                      onClick={() => {
                        onClose()
                        window.location.href = `/matches/${match.id}`
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl"
                    >
                      Ver detalles del partido
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

declare global {
  interface Window {
    google: any
  }
}
