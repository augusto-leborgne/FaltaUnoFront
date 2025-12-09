// hooks/use-map-bounds.ts
"use client"

import { useState, useCallback, useEffect } from "react"
import { logger } from "@/lib/logger"

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

/**
 * Hook para trackear los bounds del mapa y filtrar elementos visibles
 * Estilo Airbnb: actualizar cuando el usuario mueve el mapa
 */
export function useMapBounds() {
  const [bounds, setBounds] = useState<MapBounds | null>(null)
  const [isMoving, setIsMoving] = useState(false)

  const updateBounds = useCallback((newBounds: MapBounds) => {
    setBounds(newBounds)
    logger.debug('[useMapBounds] Bounds actualizados:', newBounds)
  }, [])

  const setMoving = useCallback((moving: boolean) => {
    setIsMoving(moving)
  }, [])

  /**
   * Verifica si un punto (lat, lng) está dentro de los bounds actuales
   */
  const isInBounds = useCallback((lat: number, lng: number): boolean => {
    if (!bounds) return true // Si no hay bounds, mostrar todo

    return (
      lat <= bounds.north &&
      lat >= bounds.south &&
      lng <= bounds.east &&
      lng >= bounds.west
    )
  }, [bounds])

  /**
   * Filtra items que están dentro de los bounds
   */
  const filterInBounds = useCallback(<T extends { latitud?: number | string | null, longitud?: number | string | null }>(
    items: T[]
  ): T[] => {
    if (!bounds) return items

    return items.filter(item => {
      const lat = Number(item.latitud)
      const lng = Number(item.longitud)
      
      if (Number.isNaN(lat) || Number.isNaN(lng)) return false
      
      return isInBounds(lat, lng)
    })
  }, [bounds, isInBounds])

  return {
    bounds,
    isMoving,
    updateBounds,
    setMoving,
    isInBounds,
    filterInBounds,
  }
}
