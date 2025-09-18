"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { X, ExternalLink } from "lucide-react"

interface GoogleMapsModalProps {
  isOpen: boolean
  onClose: () => void
  location: string
  lat: number
  lng: number
}

export function GoogleMapsModal({ isOpen, onClose, location, lat, lng }: GoogleMapsModalProps) {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const loadGoogleMaps = () => {
      if (typeof window !== "undefined" && !window.google) {
        const script = document.createElement("script")
        script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places`
        script.async = true
        script.defer = true
        script.onload = initializeMap
        document.head.appendChild(script)
      } else if (window.google) {
        initializeMap()
      }
    }

    const initializeMap = () => {
      if (mapRef.current && window.google) {
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat, lng },
          zoom: 16,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        })

        // Add marker for the location
        new window.google.maps.Marker({
          position: { lat, lng },
          map: map,
          title: location,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: "#16a34a",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
          },
        })
      }
    }

    loadGoogleMaps()
  }, [isOpen, lat, lng, location])

  const handleOpenGoogleMaps = () => {
    window.open(`https://maps.google.com/?q=${lat},${lng}`, "_blank")
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
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

        {/* Map container */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="absolute inset-0 w-full h-full">
            {/* Fallback content while Google Maps loads */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Cargando Google Maps...</p>
              </div>
            </div>
          </div>
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
