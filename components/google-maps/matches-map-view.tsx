"use client"

import { useState, useEffect, useRef } from "react"
import { googleMapsLoader } from "@/lib/google-maps-loader"
import { PartidoDTO } from "@/lib/api"
import { MapPin, Navigation } from "lucide-react"

interface MatchesMapViewProps {
  matches: PartidoDTO[]
  selectedMatchId?: string
  onMarkerClick?: (matchId: string) => void
  className?: string
}

export function MatchesMapView({ 
  matches, 
  selectedMatchId, 
  onMarkerClick,
  className = "" 
}: MatchesMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const [isMapReady, setIsMapReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Inicializar mapa
  useEffect(() => {
    let mounted = true

    const initMap = async () => {
      try {
        if (!mapRef.current) {
          console.log("[MatchesMapView] mapRef no disponible")
          return
        }

        console.log("[MatchesMapView] Iniciando carga de Google Maps...")

        // Cargar Google Maps
        await googleMapsLoader.load()
        
        console.log("[MatchesMapView] Google Maps cargado exitosamente")

        if (!mounted) {
          console.log("[MatchesMapView] Componente desmontado, cancelando")
          return
        }

        // Calcular el centro basado en los partidos
        const center = calculateCenter(matches)
        console.log("[MatchesMapView] Centro del mapa:", center)

        // Crear mapa
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: 13,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ],
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_CENTER
          }
        })

        googleMapRef.current = map
        setIsMapReady(true)
        console.log("[MatchesMapView] Mapa inicializado correctamente")

      } catch (err) {
        console.error("[MatchesMapView] Error inicializando mapa:", err)
        const errorMsg = err instanceof Error ? err.message : "Error al cargar el mapa"
        setError(errorMsg)
      }
    }

    initMap()

    return () => {
      mounted = false
      // Limpiar marcadores al desmontar
      markersRef.current.forEach(marker => marker.setMap(null))
      markersRef.current = []
    }
  }, [])

  // Actualizar marcadores cuando cambien los partidos
  useEffect(() => {
    if (!isMapReady || !googleMapRef.current) return

    // Limpiar marcadores existentes
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []

    // Crear nuevos marcadores
    const bounds = new google.maps.LatLngBounds()
    let hasValidLocations = false

    matches.forEach((match) => {
      if (!match.latitud || !match.longitud) return

      const position = {
        lat: match.latitud,
        lng: match.longitud
      }

      // Determinar icono según estado del partido
      const spotsLeft = (match.cantidadJugadores || 0) - (match.jugadoresActuales || 0)
      const isSelected = match.id === selectedMatchId
      
      let pinColor = "#10b981" // green-500 (spots disponibles)
      if (spotsLeft === 0) {
        pinColor = "#ef4444" // red-500 (completo)
      } else if (spotsLeft <= 3) {
        pinColor = "#f59e0b" // amber-500 (pocos lugares)
      }

      // Crear custom marker SVG
      const markerIcon = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: isSelected ? 12 : 10,
        fillColor: pinColor,
        fillOpacity: 1,
        strokeColor: "white",
        strokeWeight: isSelected ? 3 : 2,
      }

      const marker = new google.maps.Marker({
        position,
        map: googleMapRef.current!,
        icon: markerIcon,
        title: match.nombreUbicacion || "Partido",
        animation: isSelected ? google.maps.Animation.BOUNCE : undefined,
      })

      // Info window con preview del partido
      const infoWindow = new google.maps.InfoWindow({
        content: createInfoWindowContent(match),
      })

      // Click en marcador
      marker.addListener("click", () => {
        if (onMarkerClick && match.id) {
          onMarkerClick(match.id)
        }
        // Mostrar info window
        infoWindow.open(googleMapRef.current!, marker)
      })

      // Hover efecto
      marker.addListener("mouseover", () => {
        marker.setAnimation(google.maps.Animation.BOUNCE)
        setTimeout(() => marker.setAnimation(null), 750)
      })

      markersRef.current.push(marker)
      bounds.extend(position)
      hasValidLocations = true
    })

    // Ajustar vista para mostrar todos los marcadores
    if (hasValidLocations && matches.length > 0) {
      if (matches.length === 1) {
        googleMapRef.current.setCenter(bounds.getCenter())
        googleMapRef.current.setZoom(15)
      } else {
        googleMapRef.current.fitBounds(bounds, {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        })
      }
    }

  }, [matches, isMapReady, selectedMatchId, onMarkerClick])

  // Calcular centro del mapa
  const calculateCenter = (matches: PartidoDTO[]): google.maps.LatLngLiteral => {
    const validMatches = matches.filter(m => m.latitud && m.longitud)
    
    if (validMatches.length === 0) {
      // Centro de Montevideo por defecto
      return { lat: -34.9011, lng: -56.1645 }
    }

    const avgLat = validMatches.reduce((sum, m) => sum + (m.latitud || 0), 0) / validMatches.length
    const avgLng = validMatches.reduce((sum, m) => sum + (m.longitud || 0), 0) / validMatches.length

    return { lat: avgLat, lng: avgLng }
  }

  // Crear contenido del info window
  const createInfoWindowContent = (match: PartidoDTO): string => {
    const spotsLeft = (match.cantidadJugadores || 0) - (match.jugadoresActuales || 0)
    const pricePerPlayer = match.precioPorJugador || 
      (match.precioTotal && match.cantidadJugadores ? Math.round(match.precioTotal / match.cantidadJugadores) : 0)

    return `
      <div style="padding: 8px; min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; font-weight: 600; color: #111827;">
          ${match.nombreUbicacion || "Partido"}
        </h3>
        <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">
          ${match.tipoPartido?.replace("FUTBOL_", "F")} • ${formatDate(match.fecha, match.hora)}
        </div>
        <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">
          <strong>${spotsLeft}</strong> ${spotsLeft === 1 ? "lugar" : "lugares"} disponible${spotsLeft === 1 ? "" : "s"}
        </div>
        <div style="font-size: 14px; font-weight: 600; color: #059669;">
          $${pricePerPlayer} por jugador
        </div>
      </div>
    `
  }

  const formatDate = (dateString: string, timeString: string) => {
    try {
      const date = new Date(dateString)
      const time = timeString.substring(0, 5)
      return `${date.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} ${time}`
    } catch {
      return `${dateString} ${timeString}`
    }
  }

  if (error) {
    return (
      <div className={`bg-gray-100 rounded-2xl flex items-center justify-center ${className}`}>
        <div className="text-center p-6">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className={`bg-gray-100 rounded-2xl flex items-center justify-center ${className}`}>
        <div className="text-center p-6">
          <Navigation className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">No hay partidos para mostrar en el mapa</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative bg-gray-100 rounded-2xl overflow-hidden ${className}`}>
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Badge con cantidad de partidos */}
      <div className="absolute top-4 left-4 bg-white rounded-full px-3 py-1.5 shadow-lg">
        <div className="flex items-center space-x-1.5">
          <MapPin className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-gray-900">
            {matches.filter(m => m.latitud && m.longitud).length} {matches.length === 1 ? "partido" : "partidos"}
          </span>
        </div>
      </div>

      {/* Loading overlay */}
      {!isMapReady && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-gray-600 text-sm">Cargando mapa...</p>
          </div>
        </div>
      )}
    </div>
  )
}
