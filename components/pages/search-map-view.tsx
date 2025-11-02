// components/pages/search-map-view.tsx
"use client"

import React, { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, X, Calendar, Users, Navigation } from "lucide-react"
import { useRouter } from "next/navigation"
import { useGoogleMaps } from "@/lib/google-maps-loader"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface PartidoMapData {
  id: string
  tipo_partido?: string
  genero?: string
  fecha?: string
  hora?: string
  nombre_ubicacion?: string
  latitud?: number
  longitud?: number
  inscritos?: number
  capacidad?: number
  distancia?: number
}

interface SearchMapViewProps {
  partidos: PartidoMapData[]
  onClose: () => void
  onPartidoClick: (id: string) => void
}

export function SearchMapView({ partidos, onClose, onPartidoClick }: SearchMapViewProps) {
  const router = useRouter()
  const [selectedPartido, setSelectedPartido] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const { isLoaded, error, google } = useGoogleMaps()
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)

  // Solicitar geolocalización del usuario
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.warn("Error obteniendo ubicación:", error)
          // Ubicación por defecto (Montevideo, Uruguay)
          setUserLocation({ lat: -34.9011, lng: -56.1645 })
        }
      )
    } else {
      // Ubicación por defecto si no hay geolocalización
      setUserLocation({ lat: -34.9011, lng: -56.1645 })
    }
  }, [])

  // Inicializar mapa
  useEffect(() => {
    if (!isLoaded || !google || !mapRef.current || !userLocation) return

    // Filtrar partidos con coordenadas válidas
    const partidosConCoordenadas = partidos.filter(
      (p) => p.latitud !== undefined && p.longitud !== undefined
    )

    // Centro del mapa (promedio de todas las ubicaciones o ubicación del usuario)
    let center = userLocation
    if (partidosConCoordenadas.length > 0) {
      const avgLat =
        partidosConCoordenadas.reduce((sum, p) => sum + (p.latitud || 0), 0) /
        partidosConCoordenadas.length
      const avgLng =
        partidosConCoordenadas.reduce((sum, p) => sum + (p.longitud || 0), 0) /
        partidosConCoordenadas.length
      center = { lat: avgLat, lng: avgLng }
    }

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: 13,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      mapId: "search-map-view", // Requerido para AdvancedMarkerElement
    })
    mapInstanceRef.current = map

    // Agregar marcador del usuario
    if (userMarkerRef.current) {
      userMarkerRef.current.map = null
    }
    
    const userMarkerContent = document.createElement("div");
    userMarkerContent.innerHTML = `
      <div style="
        width: 16px;
        height: 16px;
        background-color: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      "></div>
    `;
    
    userMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
      position: userLocation,
      map,
      title: "Tu ubicación",
      content: userMarkerContent,
      zIndex: 1000,
    })

    // Agregar marcadores de partidos
    markersRef.current = partidosConCoordenadas.map((partido) => {
      const disponibles = (partido.capacidad || 0) - (partido.inscritos || 0)
      const isLleno = disponibles <= 0

      const markerContent = document.createElement("div");
      markerContent.innerHTML = `
        <div style="
          width: 28px;
          height: 28px;
          background-color: ${isLleno ? '#ef4444' : '#16a34a'};
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 11px;
          font-weight: bold;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ">${disponibles}</div>
      `;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: partido.latitud!, lng: partido.longitud! },
        map,
        title: partido.nombre_ubicacion,
        content: markerContent,
      })

      marker.addListener("click", () => {
        setSelectedPartido(partido.id)
        map.panTo({ lat: partido.latitud!, lng: partido.longitud! })
      })

      return marker
    })

    // Ajustar bounds para mostrar todos los marcadores
    if (partidosConCoordenadas.length > 0) {
      const bounds = new google.maps.LatLngBounds()
      bounds.extend(userLocation)
      partidosConCoordenadas.forEach((p) => {
        if (p.latitud && p.longitud) {
          bounds.extend({ lat: p.latitud, lng: p.longitud })
        }
      })
      map.fitBounds(bounds)
      
      // Evitar zoom excesivo si solo hay un partido
      const listener = google.maps.event.addListener(map, "idle", () => {
        if (map.getZoom()! > 15) map.setZoom(15)
        google.maps.event.removeListener(listener)
      })
    }

    return () => {
      markersRef.current.forEach((mk) => mk.map = null)
      markersRef.current = []
      if (userMarkerRef.current) {
        userMarkerRef.current.map = null
        userMarkerRef.current = null
      }
      mapInstanceRef.current = null
    }
  }, [isLoaded, google, partidos, userLocation])

  const selectedPartidoData = partidos.find((p) => p.id === selectedPartido)

  const handleCenterOnUser = () => {
    if (mapInstanceRef.current && userLocation) {
      mapInstanceRef.current.panTo(userLocation)
      mapInstanceRef.current.setZoom(14)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-4 px-6 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={onClose} className="p-2 -ml-2">
              <X className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Mapa de resultados</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {partidos.filter(p => p.latitud && p.longitud).length} partido{partidos.filter(p => p.latitud && p.longitud).length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <div
          ref={mapRef}
          id="search-map"
          className="absolute inset-0 w-full h-full"
        >
          {!isLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
              <LoadingSpinner size="md" variant="green" text="Cargando mapa..." />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white">
              <div className="text-center px-6">
                <MapPin className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-sm text-red-600 mb-2">Error cargando mapa</p>
                <p className="text-xs text-gray-500">{error.message}</p>
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="mt-4"
                >
                  Volver
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Center on user button */}
        {isLoaded && userLocation && (
          <button
            onClick={handleCenterOnUser}
            className="absolute bottom-32 right-4 bg-white rounded-full p-3 shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Centrar en mi ubicación"
          >
            <Navigation className="w-5 h-5 text-gray-700" />
          </button>
        )}

        {/* Legend */}
        {isLoaded && (
          <div className="absolute top-4 left-4 bg-white rounded-xl p-3 shadow-lg border border-gray-200">
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-600"></div>
                <span className="text-gray-700">Lugares disponibles</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-700">Partido lleno</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-gray-700">Tu ubicación</span>
              </div>
            </div>
          </div>
        )}

        {/* Selected Partido Card */}
        {selectedPartidoData && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  <Badge className="bg-orange-100 text-orange-800 whitespace-nowrap">
                    {selectedPartidoData.tipo_partido?.replace("FUTBOL_", "Fútbol ")}
                  </Badge>
                  {selectedPartidoData.genero && (
                    <Badge variant="outline" className="text-xs">
                      {selectedPartidoData.genero}
                    </Badge>
                  )}
                  {(() => {
                    const disponibles = (selectedPartidoData.capacidad || 0) - (selectedPartidoData.inscritos || 0)
                    const isLleno = disponibles <= 0
                    return (
                      <Badge className={`text-xs whitespace-nowrap ${isLleno ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {isLleno ? 'Lleno' : `${disponibles} lugar${disponibles !== 1 ? 'es' : ''}`}
                      </Badge>
                    )
                  })()}
                </div>
                <button
                  onClick={() => setSelectedPartido(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 -mt-1 -mr-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="font-medium text-gray-900">
                    {selectedPartidoData.fecha} • {selectedPartidoData.hora}
                  </span>
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 line-clamp-2">
                    {selectedPartidoData.nombre_ubicacion}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="text-gray-700">
                    {selectedPartidoData.inscritos}/{selectedPartidoData.capacidad} jugadores
                  </span>
                </div>

                {selectedPartidoData.distancia !== undefined && (
                  <div className="flex items-center gap-2 text-sm">
                    <Navigation className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-700">
                      A {selectedPartidoData.distancia.toFixed(1)} km
                    </span>
                  </div>
                )}
              </div>

              <Button
                onClick={() => onPartidoClick(selectedPartidoData.id)}
                className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3"
              >
                Ver detalles
              </Button>
            </div>
          </div>
        )}

        {/* Empty state if no partidos with coordinates */}
        {isLoaded && partidos.filter(p => p.latitud && p.longitud).length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90">
            <div className="text-center px-6">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2 font-medium">No hay partidos para mostrar</p>
              <p className="text-sm text-gray-500 mb-4">
                Los partidos encontrados no tienen ubicación definida
              </p>
              <Button onClick={onClose} variant="outline">
                Volver a resultados
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
