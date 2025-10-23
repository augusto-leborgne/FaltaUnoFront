// components/google-maps/matches-map-view.tsx - VERSIÓN CORREGIDA

"use client"

import { useState, useEffect, useRef } from "react"
import { googleMapsLoader } from "@/lib/google-maps-loader"
import { PartidoDTO } from "@/lib/api"
import { MapPin, Navigation, AlertCircle } from "lucide-react"

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
  const [isLoading, setIsLoading] = useState(true)

  // ============================================
  // INICIALIZAR MAPA - SOLO UNA VEZ
  // ============================================
  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout | undefined

    const initMap = async () => {
      try {
        // Validar que tenemos el contenedor
        if (!mapRef.current) {
          console.log("[MatchesMapView] mapRef no disponible aún")
          return
        }

        console.log("[MatchesMapView] Iniciando carga de Google Maps...")
        setIsLoading(true)
        setError(null)

        // Cargar Google Maps con timeout de 15 segundos
        const loadPromise = googleMapsLoader.load()
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error("Timeout: Google Maps tardó más de 15 segundos en cargar"))
          }, 15000)
        })

        await Promise.race([loadPromise, timeoutPromise])
        
        if (timeoutId) clearTimeout(timeoutId)
        
        if (!mounted) {
          console.log("[MatchesMapView] Componente desmontado, cancelando")
          return
        }

        console.log("[MatchesMapView] Google Maps cargado exitosamente")

        // Verificar que google.maps esté disponible
        if (!window.google?.maps) {
          throw new Error("Google Maps no está disponible después de cargar")
        }

        // Calcular centro del mapa
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
        setIsLoading(false)
        console.log("[MatchesMapView] Mapa inicializado correctamente")

      } catch (err) {
        console.error("[MatchesMapView] Error inicializando mapa:", err)
        if (mounted) {
          const errorMsg = err instanceof Error ? err.message : "Error al cargar el mapa"
          setError(errorMsg)
          setIsLoading(false)
        }
      }
    }

    initMap()

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
      
      // Limpiar marcadores al desmontar
      markersRef.current.forEach(marker => {
        try {
          marker.setMap(null)
        } catch (e) {
          console.warn("[MatchesMapView] Error limpiando marcador:", e)
        }
      })
      markersRef.current = []
    }
  }, []) // ✅ Solo ejecutar una vez al montar

  // ============================================
  // ACTUALIZAR MARCADORES - CUANDO CAMBIEN PARTIDOS
  // ============================================
  useEffect(() => {
    // Solo actualizar si el mapa está listo
    if (!isMapReady || !googleMapRef.current) {
      console.log("[MatchesMapView] Mapa no está listo aún, esperando...")
      return
    }

    console.log("[MatchesMapView] Actualizando marcadores:", matches.length, "partidos")

    // Limpiar marcadores existentes
    markersRef.current.forEach(marker => {
      try {
        marker.setMap(null)
      } catch (e) {
        console.warn("[MatchesMapView] Error limpiando marcador:", e)
      }
    })
    markersRef.current = []

    // Si no hay partidos, no hacer nada más
    if (matches.length === 0) {
      console.log("[MatchesMapView] No hay partidos para mostrar")
      return
    }

    // Crear nuevos marcadores
    const bounds = new google.maps.LatLngBounds()
    let hasValidLocations = false

    matches.forEach((match) => {
      // Validar coordenadas
      if (!match.latitud || !match.longitud) {
        console.warn("[MatchesMapView] Partido sin coordenadas:", match.id)
        return
      }

      // Validar que sean números válidos
      const lat = Number(match.latitud)
      const lng = Number(match.longitud)
      
      if (isNaN(lat) || isNaN(lng)) {
        console.warn("[MatchesMapView] Coordenadas inválidas:", match.id, lat, lng)
        return
      }

      const position = { lat, lng }

      // Determinar icono según estado del partido
      const spotsLeft = (match.cantidadJugadores || 0) - (match.jugadoresActuales || 0)
      const isSelected = match.id === selectedMatchId
      
      let pinColor = "#10b981" // green-500 (spots disponibles)
      if (spotsLeft === 0) {
        pinColor = "#ef4444" // red-500 (completo)
      } else if (spotsLeft <= 3) {
        pinColor = "#f59e0b" // amber-500 (pocos lugares)
      }

      try {
        // Crear marcador
        const marker = new google.maps.Marker({
          position,
          map: googleMapRef.current!,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isSelected ? 12 : 10,
            fillColor: pinColor,
            fillOpacity: 1,
            strokeColor: "white",
            strokeWeight: isSelected ? 3 : 2,
          },
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
        
      } catch (err) {
        console.error("[MatchesMapView] Error creando marcador:", err)
      }
    })

    // Ajustar vista para mostrar todos los marcadores
    if (hasValidLocations && matches.length > 0) {
      try {
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
      } catch (err) {
        console.error("[MatchesMapView] Error ajustando bounds:", err)
      }
    }

    console.log("[MatchesMapView] Marcadores actualizados:", markersRef.current.length)

  }, [matches, isMapReady, selectedMatchId, onMarkerClick]) // ✅ Dependencias correctas

  // ============================================
  // HELPERS
  // ============================================

  const calculateCenter = (matches: PartidoDTO[]): google.maps.LatLngLiteral => {
    const validMatches = matches.filter(m => {
      const lat = Number(m.latitud)
      const lng = Number(m.longitud)
      return !isNaN(lat) && !isNaN(lng)
    })
    
    if (validMatches.length === 0) {
      // Centro de Montevideo por defecto
      return { lat: -34.9011, lng: -56.1645 }
    }

    const avgLat = validMatches.reduce((sum, m) => sum + Number(m.latitud || 0), 0) / validMatches.length
    const avgLng = validMatches.reduce((sum, m) => sum + Number(m.longitud || 0), 0) / validMatches.length

    return { lat: avgLat, lng: avgLng }
  }

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
          ${match.tipoPartido?.replace("FUTBOL_", "F") || "Fútbol"} • ${formatDate(match.fecha, match.hora)}
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

  // ============================================
  // RENDER - ESTADOS
  // ============================================

  // Render error
  if (error) {
    return (
      <div className={`bg-gray-100 rounded-2xl flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-gray-900 font-medium mb-1">Error al cargar el mapa</p>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  // Render sin partidos
  if (matches.length === 0) {
    return (
      <div className={`bg-gray-100 rounded-2xl flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <Navigation className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">No hay partidos para mostrar en el mapa</p>
        </div>
      </div>
    )
  }

  // ============================================
  // RENDER - MAPA
  // ============================================

  return (
    <div className={`relative bg-gray-100 rounded-2xl overflow-hidden ${className}`}>
      {/* Contenedor del mapa */}
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Badge con cantidad de partidos */}
      {isMapReady && matches.length > 0 && (
        <div className="absolute top-4 left-4 bg-white rounded-full px-3 py-1.5 shadow-lg z-10">
          <div className="flex items-center space-x-1.5">
            <MapPin className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-900">
              {matches.filter(m => m.latitud && m.longitud).length} {matches.length === 1 ? "partido" : "partidos"}
            </span>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
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