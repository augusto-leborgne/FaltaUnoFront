"use client"

import { useState } from "react"
import { MapPin, Maximize2 } from "lucide-react"
import { GoogleMapsModal } from "./google-maps-modal"

interface CompressedMapProps {
  location: string
  lat?: number
  lng?: number
  className?: string
  disableModal?: boolean
}

export function CompressedMap({ 
  location, 
  lat = -34.9011, 
  lng = -56.1645, 
  className = "",
  disableModal = false
}: CompressedMapProps) {
  const [showFullMap, setShowFullMap] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Google Maps API Key (debe estar en variables de entorno)
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""

  // Verificar si tenemos coordenadas específicas (diferentes de las predeterminadas de Montevideo)
  const hasSpecificLocation = lat !== -34.9011 || lng !== -56.1645

  const handleMapClick = () => {
    if (!disableModal) {
      setShowFullMap(true)
    }
  }

  // URL para mapa estático de Google Maps
  // https://developers.google.com/maps/documentation/maps-static/start
  const staticMapUrl = hasSpecificLocation && GOOGLE_MAPS_API_KEY && !imageError
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x200&scale=2&markers=color:green%7C${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&style=feature:poi|visibility:off`
    : null

  return (
    <>
      <div
        onClick={handleMapClick}
        className={`relative bg-gradient-to-br from-green-50 to-blue-50 rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-md group ${className}`}
        style={{ height: "120px" }}
      >
        {/* Mapa estático real de Google Maps */}
        {staticMapUrl ? (
          <img
            src={staticMapUrl}
            alt={`Mapa de ${location}`}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <>
            {/* Fallback: Grid pattern background */}
            <div className="absolute inset-0 opacity-20">
              <svg width="100%" height="100%" className="text-gray-300">
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* Fictional roads */}
            <div className="absolute inset-0">
              <div className="absolute top-8 left-0 right-0 h-0.5 bg-gray-300 opacity-60"></div>
              <div className="absolute top-16 left-0 right-0 h-0.5 bg-gray-300 opacity-60"></div>
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300 opacity-60"></div>
              <div className="absolute left-16 top-0 bottom-0 w-0.5 bg-gray-300 opacity-60"></div>
            </div>

            {/* Location marker for fallback */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className={`rounded-full p-2 shadow-lg ${hasSpecificLocation ? "bg-green-600" : "bg-orange-500"}`}>
                <MapPin className="w-4 h-4 text-white" />
              </div>
            </div>
          </>
        )}

        {/* Overlay gradient para mejor legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Expand indicator */}
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-md group-hover:scale-110 transition-transform">
          <Maximize2 className="w-3.5 h-3.5 text-gray-700" />
        </div>

        {/* Location label */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{location}</p>
              {!hasSpecificLocation && (
                <p className="text-xs text-orange-300 font-medium">Ubicación aproximada</p>
              )}
            </div>
          </div>
        </div>

        {/* Hover hint */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-lg">
            <p className="text-xs font-medium text-gray-900">Click para expandir</p>
          </div>
        </div>
      </div>

      {/* Full-screen Google Maps modal */}
      {!disableModal && showFullMap && (
        <GoogleMapsModal
          isOpen={showFullMap}
          onClose={() => setShowFullMap(false)}
          location={location}
          lat={lat}
          lng={lng}
        />
      )}
    </>
  )
}