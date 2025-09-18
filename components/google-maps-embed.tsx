"use client"

import { useEffect, useRef } from "react"

interface GoogleMapsEmbedProps {
  lat: number
  lng: number
  zoom?: number
  width?: string
  height?: string
  className?: string
  markers?: Array<{
    lat: number
    lng: number
    title?: string
    info?: string
  }>
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
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
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
          zoom,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        })

        // Add markers if provided
        markers.forEach((marker) => {
          const mapMarker = new window.google.maps.Marker({
            position: { lat: marker.lat, lng: marker.lng },
            map: map,
            title: marker.title || "",
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#16a34a",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
          })

          if (marker.info) {
            const infoWindow = new window.google.maps.InfoWindow({
              content: marker.info,
            })

            mapMarker.addListener("click", () => {
              infoWindow.open(map, mapMarker)
            })
          }
        })
      }
    }

    loadGoogleMaps()
  }, [lat, lng, zoom, markers])

  return (
    <div ref={mapRef} className={`rounded-lg overflow-hidden ${className}`} style={{ width, height }}>
      {/* Fallback content */}
      <div className="w-full h-full bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Cargando mapa...</p>
        </div>
      </div>
    </div>
  )
}
