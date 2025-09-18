"use client"

import { useState } from "react"
import { MapPin, Maximize2 } from "lucide-react"
import { GoogleMapsModal } from "./google-maps-modal"

interface CompressedMapProps {
  location: string
  lat?: number
  lng?: number
  className?: string
}

export function CompressedMap({ location, lat = -34.9011, lng = -56.1645, className = "" }: CompressedMapProps) {
  const [showFullMap, setShowFullMap] = useState(false)

  const handleMapClick = () => {
    setShowFullMap(true)
  }

  return (
    <>
      <div
        onClick={handleMapClick}
        className={`relative bg-gradient-to-br from-green-50 to-blue-50 rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-md ${className}`}
        style={{ height: "120px" }}
      >
        {/* Fictional map grid pattern */}
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

        {/* Location marker */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="bg-green-600 rounded-full p-2 shadow-lg">
            <MapPin className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Expand indicator */}
        <div className="absolute top-2 right-2 bg-white/80 rounded-full p-1.5 shadow-sm">
          <Maximize2 className="w-3 h-3 text-gray-600" />
        </div>

        {/* Location label */}
        <div className="absolute bottom-2 left-2 right-2">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1">
            <p className="text-xs font-medium text-gray-800 truncate">{location}</p>
          </div>
        </div>
      </div>

      {/* Full-screen Google Maps modal */}
      <GoogleMapsModal
        isOpen={showFullMap}
        onClose={() => setShowFullMap(false)}
        location={location}
        lat={lat}
        lng={lng}
      />
    </>
  )
}
