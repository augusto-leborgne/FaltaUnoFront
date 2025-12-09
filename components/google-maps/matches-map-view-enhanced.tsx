// components/google-maps/matches-map-view-enhanced.tsx
// Mapa estilo Airbnb con búsqueda, clustering, geolocalización y filtrado dinámico

"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { googleMapsLoader } from "@/lib/google-maps-loader"
import { PartidoDTO } from "@/lib/api"
import { MapPin, Navigation, AlertCircle, Crosshair, Search, X, Loader2 } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { logger } from "@/lib/logger"
import { useMapBounds, MapBounds } from "@/hooks/use-map-bounds"

interface MatchesMapViewEnhancedProps {
  matches: PartidoDTO[]
  selectedMatchId?: string
  onMarkerClick?: (matchId: string) => void
  onBoundsChange?: (visibleMatches: PartidoDTO[]) => void
  currentUserId?: string
  userLocation?: { lat: number, lng: number } // Ubicación del usuario (barrio)
  className?: string
}

export function MatchesMapViewEnhanced({
  matches,
  selectedMatchId,
  onMarkerClick,
  onBoundsChange,
  currentUserId,
  userLocation,
  className = "",
}: MatchesMapViewEnhancedProps) {
  // Refs
  const mapDivRef = useRef<HTMLDivElement | null>(null)
  const googleMapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const markerClustererRef = useRef<any>(null) // MarkerClusterer

  // Estados
  const [containerReady, setContainerReady] = useState(false)
  const [isMapReady, setIsMapReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchValue, setSearchValue] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [currentZoom, setCurrentZoom] = useState(13)

  // Hook para trackear bounds del mapa
  const { bounds, updateBounds, filterInBounds } = useMapBounds()

  // Callback ref para el contenedor
  const setMapRef = useCallback((node: HTMLDivElement | null) => {
    mapDivRef.current = node
    setContainerReady(!!node)
  }, [])

  // Filtrar matches visibles según bounds
  const visibleMatches = useMemo(() => {
    return filterInBounds(matches)
  }, [matches, filterInBounds])

  // Notificar cambios en matches visibles
  useEffect(() => {
    if (onBoundsChange) {
      onBoundsChange(visibleMatches)
    }
  }, [visibleMatches, onBoundsChange])

  // ============================================
  // INICIALIZAR MAPA
  // ============================================
  useEffect(() => {
    if (!containerReady || !mapDivRef.current) return

    let mounted = true
    let timeoutId: number | undefined

    const initMap = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Cargar Google Maps con timeout
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
          throw new Error("Google Maps no está disponible")
        }

        // Centro inicial: ubicación del usuario o promedio de partidos
        const center = userLocation || calculateCenter(matches)
        
        // Zoom inicial: 14 para barrio (más cercano que 13)
        const initialZoom = userLocation ? 14 : (matches.length > 0 ? 13 : 12)

        // Crear mapa
        const map = new window.google.maps.Map(mapDivRef.current!, {
          center,
          zoom: initialZoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          zoomControlOptions: { 
            position: window.google.maps.ControlPosition.RIGHT_CENTER 
          },
          minZoom: 10,
          maxZoom: 18,
          mapId: "matches-map-enhanced",
          gestureHandling: 'greedy', // Mejor para móvil
        })

        googleMapRef.current = map
        setCurrentZoom(initialZoom)

        // Listeners para actualizar bounds cuando el mapa se mueve
        map.addListener('bounds_changed', () => {
          const mapBounds = map.getBounds()
          if (mapBounds) {
            const ne = mapBounds.getNorthEast()
            const sw = mapBounds.getSouthWest()
            updateBounds({
              north: ne.lat(),
              south: sw.lat(),
              east: ne.lng(),
              west: sw.lng(),
            })
          }
        })

        // Listener para zoom
        map.addListener('zoom_changed', () => {
          const zoom = map.getZoom()
          if (zoom !== undefined) {
            setCurrentZoom(zoom)
          }
        })

        setIsMapReady(true)
        setIsLoading(false)

        logger.log('[MatchesMapEnhanced] Mapa inicializado en:', center, 'zoom:', initialZoom)
      } catch (err) {
        logger.error("[MatchesMapEnhanced] Error inicializando mapa:", err)
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
        } catch {/* noop */}
      })
      markersRef.current = []
      
      // Limpiar clusterer
      if (markerClustererRef.current) {
        markerClustererRef.current.clearMarkers()
        markerClustererRef.current = null
      }
    }
  }, [containerReady, userLocation])

  // ============================================
  // INICIALIZAR AUTOCOMPLETE (búsqueda)
  // ============================================
  useEffect(() => {
    if (!isMapReady || !googleMapRef.current || !searchInputRef.current) return

    try {
      const autocomplete = new window.google.maps.places.Autocomplete(
        searchInputRef.current,
        {
          fields: ['geometry', 'formatted_address', 'name'],
          types: ['address', 'establishment'],
          componentRestrictions: { country: 'uy' }, // Restringir a Uruguay
        }
      )

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (place.geometry?.location && googleMapRef.current) {
          const location = place.geometry.location
          googleMapRef.current.setCenter(location)
          
          // Zoom según el tipo de lugar
          if (place.geometry.viewport) {
            googleMapRef.current.fitBounds(place.geometry.viewport)
          } else {
            // Zoom apropiado según el nivel de especificidad
            const name = place.name || place.formatted_address || ''
            let zoom = 15 // Por defecto: dirección específica
            
            if (name.toLowerCase().includes('montevideo') || name.toLowerCase().includes('ciudad')) {
              zoom = 12 // Ciudad
            } else if (name.toLowerCase().includes('barrio') || name.toLowerCase().includes('zona')) {
              zoom = 14 // Barrio
            }
            
            googleMapRef.current.setZoom(zoom)
          }
          
          logger.log('[MatchesMapEnhanced] Búsqueda:', place.formatted_address)
        }
      })

      autocompleteRef.current = autocomplete
    } catch (err) {
      logger.error('[MatchesMapEnhanced] Error inicializando autocomplete:', err)
    }

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [isMapReady])

  // ============================================
  // ACTUALIZAR MARCADORES CON/SIN CLUSTERING
  // ============================================
  useEffect(() => {
    if (!isMapReady || !googleMapRef.current) return

    // Limpiar marcadores previos
    markersRef.current.forEach((m) => m.map = null)
    markersRef.current = []

    if (matches.length === 0) return

    const newMarkers: google.maps.marker.AdvancedMarkerElement[] = []

    matches.forEach((match) => {
      if (!match.latitud || !match.longitud) return
      const lat = Number(match.latitud)
      const lng = Number(match.longitud)
      if (Number.isNaN(lat) || Number.isNaN(lng)) return

      const spotsLeft = (match.cantidadJugadores || 0) - (match.jugadoresActuales || 0)
      const isSelected = match.id === selectedMatchId

      let pinColor = "#10b981" // verde
      if (spotsLeft === 0) pinColor = "#ef4444" // rojo
      else if (spotsLeft <= 3) pinColor = "#f59e0b" // ámbar

      // Crear contenido del marker
      const markerContent = document.createElement("div")
      markerContent.innerHTML = `
        <div style="position: relative; cursor: pointer;">
          <div style="
            background-color: ${pinColor};
            width: ${isSelected ? '42px' : '36px'};
            height: ${isSelected ? '42px' : '36px'};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            ${isSelected ? 'animation: bounce 0.75s;' : ''}
          ">
            <div style="transform: rotate(45deg); font-size: ${isSelected ? '18px' : '16px'};">
              ⚽
            </div>
          </div>
          <div style="
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: ${isSelected ? '16px' : '12px'};
            height: 4px;
            background: rgba(0,0,0,0.2);
            border-radius: 50%;
            filter: blur(2px);
          "></div>
        </div>
        <style>
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-12px); }
          }
        </style>
      `

      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        position: { lat, lng },
        map: googleMapRef.current!,
        content: markerContent,
        title: match.nombreUbicacion || "Partido",
      })

      marker.addListener("gmp-click", () => {
        if (onMarkerClick && match.id) onMarkerClick(match.id)
      })

      newMarkers.push(marker)
    })

    markersRef.current = newMarkers

    // TODO: Implementar clustering cuando hay muchos marcadores en poco zoom
    // Por ahora mostramos todos los marcadores individuales
    
  }, [matches, isMapReady, selectedMatchId, onMarkerClick, currentZoom])

  // ============================================
  // GEOLOCALIZACIÓN - Centrar en ubicación actual
  // ============================================
  const centerOnCurrentLocation = useCallback(() => {
    if (!googleMapRef.current) return

    setIsGettingLocation(true)

    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización')
      setIsGettingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }

        googleMapRef.current!.setCenter(location)
        googleMapRef.current!.setZoom(15) // Zoom cercano para ubicación actual

        // Agregar marcador temporal en la ubicación
        const marker = new window.google.maps.marker.AdvancedMarkerElement({
          position: location,
          map: googleMapRef.current!,
          title: "Tu ubicación",
        })

        // Remover marcador después de 3 segundos
        setTimeout(() => {
          marker.map = null
        }, 3000)

        setIsGettingLocation(false)
        logger.log('[MatchesMapEnhanced] Centrado en ubicación actual:', location)
      },
      (error) => {
        logger.error('[MatchesMapEnhanced] Error obteniendo ubicación:', error)
        
        let message = 'No se pudo obtener tu ubicación'
        if (error.code === error.PERMISSION_DENIED) {
          message = 'Debes permitir el acceso a tu ubicación'
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = 'Ubicación no disponible'
        } else if (error.code === error.TIMEOUT) {
          message = 'Tiempo de espera agotado'
        }
        
        alert(message)
        setIsGettingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }, [])

  // ============================================
  // HELPERS
  // ============================================
  const calculateCenter = (matches: PartidoDTO[]): google.maps.LatLngLiteral => {
    const valid = matches.filter((m) => 
      !Number.isNaN(Number(m.latitud)) && !Number.isNaN(Number(m.longitud))
    )
    if (valid.length === 0) return { lat: -34.9011, lng: -56.1645 } // Montevideo
    
    const avgLat = valid.reduce((s, m) => s + Number(m.latitud || 0), 0) / valid.length
    const avgLng = valid.reduce((s, m) => s + Number(m.longitud || 0), 0) / valid.length
    return { lat: avgLat, lng: avgLng }
  }

  // ============================================
  // RENDER
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
          <p className="text-gray-600 text-sm">No hay partidos para mostrar</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative bg-gray-100 rounded-2xl overflow-hidden ${className}`}>
      {/* Contenedor del mapa */}
      <div ref={setMapRef} className="w-full h-full" />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <LoadingSpinner size="lg" variant="green" text="Cargando mapa..." />
        </div>
      )}

      {/* Botón para centrar en ubicación actual - Esquina superior derecha */}
      {isMapReady && (
        <div className="absolute top-3 right-3 z-10">
          <Button
            variant="outline"
            size="icon"
            onClick={centerOnCurrentLocation}
            disabled={isGettingLocation}
            className="bg-white shadow-lg border-0 h-10 w-10 xs:h-11 xs:w-11 rounded-full hover:bg-blue-50"
            title="Centrar en mi ubicación"
          >
            {isGettingLocation ? (
              <Loader2 className="w-4 h-4 xs:w-5 xs:h-5 animate-spin text-blue-600" />
            ) : (
              <Crosshair className="w-4 h-4 xs:w-5 xs:h-5 text-blue-600" />
            )}
          </Button>
        </div>
      )}

      {/* Contador de partidos visibles */}
      {isMapReady && bounds && (
        <div className="absolute bottom-3 left-3 z-10 bg-white shadow-lg rounded-full px-4 py-2 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-green-600" />
          <span className="text-sm font-semibold text-gray-900">
            {visibleMatches.length} {visibleMatches.length === 1 ? 'partido' : 'partidos'}
          </span>
        </div>
      )}
    </div>
  )
}
