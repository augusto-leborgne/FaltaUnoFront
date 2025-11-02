// components/google-maps/matches-map-view.tsx - VERSIÓN CORREGIDA (init robusto)

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { googleMapsLoader } from "@/lib/google-maps-loader"
import { PartidoDTO } from "@/lib/api"
import { MapPin, Navigation, AlertCircle } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

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
  className = "",
}: MatchesMapViewProps) {
  // 🔒 Usamos callback ref para saber cuándo el contenedor existe realmente
  const mapDivRef = useRef<HTMLDivElement | null>(null)
  const [containerReady, setContainerReady] = useState(false)
  const setMapRef = useCallback((node: HTMLDivElement | null) => {
    mapDivRef.current = node
    setContainerReady(!!node)
  }, [])

  const googleMapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const [isMapReady, setIsMapReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // ============================================
  // INICIALIZAR MAPA (solo cuando el contenedor existe)
  // ============================================
  useEffect(() => {
    if (!containerReady || !mapDivRef.current) return

    let mounted = true
    let timeoutId: number | undefined

    const initMap = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Cargar Google Maps con timeout de 15s
        const loadPromise = googleMapsLoader.load()
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = window.setTimeout(() => {
            reject(new Error("Timeout: Google Maps tardó más de 15 segundos en cargar"))
          }, 15000)
        })

        await Promise.race([loadPromise, timeoutPromise])

        if (!mounted) return
        if (timeoutId) window.clearTimeout(timeoutId)

        if (!window.google?.maps?.ControlPosition) {
          throw new Error("Google Maps no está disponible después de cargar")
        }

        // Centro inicial en promedio de partidos o Montevideo
        const center = calculateCenter(matches)

        // Crear mapa con zoom apropiado para la ciudad (no país/continente)
        const map = new window.google.maps.Map(mapDivRef.current!, {
          center,
          zoom: matches.length > 0 ? 13 : 12, // Zoom 12-13 = ciudad, 13-15 = barrio
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_CENTER },
          minZoom: 10, // Evitar zoom muy alejado (país/continente)
          maxZoom: 18,
          mapId: "matches-map-view", // Requerido para AdvancedMarkerElement
        })

        googleMapRef.current = map
        setIsMapReady(true)
        setIsLoading(false)
      } catch (err) {
        console.error("[MatchesMapView] Error inicializando mapa:", err)
        if (mounted) {
          setError(err instanceof Error ? err.message : "Error al cargar el mapa")
          setIsLoading(false)
        }
      }
    }

    initMap()

    return () => {
      mounted = false
      if (timeoutId) window.clearTimeout(timeoutId)
      // Limpiar marcadores
      markersRef.current.forEach((marker) => {
        try {
          marker.map = null
        } catch {
          /* noop */
        }
      })
      markersRef.current = []
    }
  }, [containerReady]) // ✅ solo cuando el div existe

  // ============================================
  // ACTUALIZAR MARCADORES CUANDO CAMBIAN PARTIDOS
  // ============================================
  useEffect(() => {
    if (!isMapReady || !googleMapRef.current) return

    // Limpiar marcadores
    markersRef.current.forEach((m) => m.map = null)
    markersRef.current = []

    if (matches.length === 0) return

    const bounds = new window.google.maps.LatLngBounds()
    let hasValidLocations = false

    matches.forEach((match) => {
      if (!match.latitud || !match.longitud) return
      const lat = Number(match.latitud)
      const lng = Number(match.longitud)
      if (Number.isNaN(lat) || Number.isNaN(lng)) return

      const spotsLeft =
        (match.cantidadJugadores || 0) - (match.jugadoresActuales || 0)
      const isSelected = match.id === selectedMatchId

      let pinColor = "#10b981" // verde
      if (spotsLeft === 0) pinColor = "#ef4444" // rojo
      else if (spotsLeft <= 3) pinColor = "#f59e0b" // ámbar

      // Crear contenido HTML del marker
      const markerContent = document.createElement("div")
      markerContent.innerHTML = `
        <div style="
          background-color: ${pinColor};
          width: ${isSelected ? '24px' : '20px'};
          height: ${isSelected ? '24px' : '20px'};
          border-radius: 50%;
          border: ${isSelected ? '3px' : '2px'} solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          font-weight: bold;
          cursor: pointer;
          ${isSelected ? 'animation: bounce 0.75s;' : ''}
        ">
          ${spotsLeft > 0 ? spotsLeft : ''}
        </div>
        <style>
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        </style>
      `

      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        position: { lat, lng },
        map: googleMapRef.current!,
        content: markerContent,
        title: match.nombreUbicacion || "Partido",
      })

      const infoWindow = new window.google.maps.InfoWindow({
        content: createInfoWindowContent(match),
      })

      marker.addListener("click", () => {
        if (onMarkerClick && match.id) onMarkerClick(match.id)
        infoWindow.open(googleMapRef.current!, marker)
      })

      markersRef.current.push(marker)
      bounds.extend({ lat, lng })
      hasValidLocations = true
    })

    // Ajustar vista
    if (hasValidLocations) {
      if (matches.length === 1) {
        googleMapRef.current.setCenter(bounds.getCenter())
        googleMapRef.current.setZoom(15)
      } else {
        googleMapRef.current.fitBounds(bounds, {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50,
        } as google.maps.Padding)
      }
    }
  }, [matches, isMapReady, selectedMatchId, onMarkerClick])

  // ============================================
  // HELPERS
  // ============================================
  const calculateCenter = (matches: PartidoDTO[]): google.maps.LatLngLiteral => {
    const valid = matches.filter((m) => !Number.isNaN(Number(m.latitud)) && !Number.isNaN(Number(m.longitud)))
    if (valid.length === 0) return { lat: -34.9011, lng: -56.1645 } // Montevideo
    const avgLat = valid.reduce((s, m) => s + Number(m.latitud || 0), 0) / valid.length
    const avgLng = valid.reduce((s, m) => s + Number(m.longitud || 0), 0) / valid.length
    return { lat: avgLat, lng: avgLng }
  }

  const createInfoWindowContent = (match: PartidoDTO): string => {
    const spotsLeft =
      (match.cantidadJugadores || 0) - (match.jugadoresActuales || 0)
    const pricePerPlayer =
      match.precioPorJugador ||
      (match.precioTotal && match.cantidadJugadores
        ? Math.round(match.precioTotal / match.cantidadJugadores)
        : 0)

    return `
      <div style="padding: 8px; min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; font-weight: 600; color: #111827;">
          ${match.nombreUbicacion || "Partido"}
        </h3>
        <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">
          ${match.tipoPartido?.replace("FUTBOL_", "F") || "Fútbol"} • ${formatDate(
            match.fecha,
            match.hora
          )}
        </div>
        <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">
          <strong>${spotsLeft}</strong> ${
      spotsLeft === 1 ? "lugar" : "lugares"
    } disponible${spotsLeft === 1 ? "" : "s"}
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
  // RENDER – estados
  // ============================================
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

  return (
    <div className={`relative bg-gray-100 rounded-2xl overflow-hidden ${className}`}>
      {/* Contenedor del mapa */}
      <div ref={setMapRef} className="w-full h-full" />

      {/* Badge con cantidad de partidos */}
      {isMapReady && matches.length > 0 && (
        <div className="absolute top-4 left-4 bg-white rounded-full px-3 py-1.5 shadow-lg z-10">
          <div className="flex items-center space-x-1.5">
            <MapPin className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-900">
              {matches.filter((m) => m.latitud && m.longitud).length}{" "}
              {matches.length === 1 ? "partido" : "partidos"}
            </span>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <LoadingSpinner size="lg" variant="green" text="Cargando mapa..." />
        </div>
      )}
    </div>
  )
}