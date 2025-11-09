// components/ui/user-avatar.tsx - VERSIÓN OPTIMIZADA
"use client"


import { logger } from '@/lib/logger'
import React, { useState, useEffect, useMemo } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { PhotoCache } from "@/lib/photo-cache"

interface UserAvatarProps {
  /** Base64 encoded photo string (with or without data URI prefix) */
  photo?: string | null
  /** User ID for fetching photo from cache/server */
  userId?: string
  /** User's name for fallback initials */
  name?: string
  /** User's surname for fallback initials */
  surname?: string
  /** Full name (alternative to name/surname) */
  fullName?: string
  /** Custom className for the avatar container */
  className?: string
  /** Custom className for the fallback */
  fallbackClassName?: string
  /** onClick handler */
  onClick?: () => void
  /** Lazy load the image (default: false) */
  lazy?: boolean
}

/**
 * UserAvatar - Componente reutilizable para mostrar avatares de usuario
 * 
 * OPTIMIZACIONES v2.0:
 * - Cache en memoria y sessionStorage
 * - Lazy loading opcional
 * - Fetching automático desde servidor si se provee userId
 * - Normalización automática de formatos base64
 * 
 * Maneja automáticamente:
 * - Fotos en base64 con o sin prefijo data:image
 * - Carga desde servidor usando userId
 * - Iniciales calculadas desde nombre/apellido o fullName
 * - Fallback con iniciales estilizadas
 * 
 * @example
 * ```tsx
 * // Con foto base64 directa
 * <UserAvatar 
 *   photo={user.foto_perfil}
 *   name={user.nombre}
 *   surname={user.apellido}
 *   className="w-12 h-12"
 * />
 * 
 * // Con userId (carga automática desde servidor + cache)
 * <UserAvatar 
 *   userId={user.id}
 *   name={user.nombre}
 *   surname={user.apellido}
 *   className="w-12 h-12"
 *   lazy
 * />
 * 
 * // Con nombre completo
 * <UserAvatar 
 *   photo={user.foto_perfil}
 *   fullName="Juan Pérez"
 *   className="w-20 h-20"
 *   onClick={() => router.push(`/users/${user.id}`)}
 * />
 * ```
 */
export function UserAvatar({
  photo,
  userId,
  name,
  surname,
  fullName,
  className,
  fallbackClassName,
  onClick,
  lazy = false,
}: UserAvatarProps): JSX.Element {
  const [loadedPhoto, setLoadedPhoto] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  
  // ⚡ OPTIMIZACIÓN: Cargar foto desde cache/servidor si se provee userId
  useEffect(() => {
    // Si ya tenemos photo directa, no necesitamos cargar
    if (photo) {
      setLoadedPhoto(photo)
      return
    }
    
    // Si no hay userId, no hay nada que cargar
    if (!userId) {
      setLoadedPhoto(null)
      return
    }
    
    // Cargar desde cache/servidor
    let cancelled = false
    setIsLoading(true)
    
    PhotoCache.getPhoto(userId)
      .then(cachedPhoto => {
        if (!cancelled && cachedPhoto) {
          setLoadedPhoto(cachedPhoto)
          setHasError(false)
        }
      })
      .catch(err => {
        logger.warn(`[UserAvatar] Error loading photo for ${userId}:`, err)
        if (!cancelled) {
          setHasError(true)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })
    
    return () => {
      cancelled = true
    }
  }, [photo, userId])
  
  // Normalizar la foto a data URI si es necesario
  const normalizedPhoto = React.useMemo(() => {
    const photoToUse = photo || loadedPhoto
    if (!photoToUse) return null
    
    // Validar que no sea una data URI malformada (double-encoded)
    if (photoToUse.includes('data:image') && photoToUse.includes('data:text/html')) {
      console.error('[UserAvatar] Malformed data URI detected, ignoring photo')
      return null
    }
    
    // Si ya tiene el prefijo data:image, usarla directamente
    if (photoToUse.startsWith('data:image')) {
      return photoToUse
    }
    
    // Si es base64 sin prefijo, agregar el prefijo
    return `data:image/jpeg;base64,${photoToUse}`
  }, [photo, loadedPhoto])

  // Calcular iniciales
  const initials = React.useMemo(() => {
    if (fullName) {
      return fullName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(word => word[0])
        .join("")
        .toUpperCase()
    }
    
    if (name || surname) {
      const n = name?.[0] || ""
      const s = surname?.[0] || ""
      return (n + s).toUpperCase() || "U"
    }
    
    return "U"
  }, [name, surname, fullName])

  // Calcular color de fondo basado en las iniciales (para consistencia)
  const bgColor = React.useMemo(() => {
    const colors = [
      "bg-orange-100 text-orange-700",
      "bg-blue-100 text-blue-700",
      "bg-green-100 text-green-700",
      "bg-purple-100 text-purple-700",
      "bg-pink-100 text-pink-700",
      "bg-yellow-100 text-yellow-700",
    ]
    
    const charCode = initials.charCodeAt(0) || 0
    return colors[charCode % colors.length]
  }, [initials])

  return (
    <Avatar 
      className={cn(
        className, 
        onClick && "cursor-pointer hover:opacity-80 transition-opacity",
        isLoading && "animate-pulse"
      )}
      onClick={onClick}
    >
      {normalizedPhoto && !hasError && (
        <AvatarImage 
          src={normalizedPhoto} 
          alt={fullName || `${name} ${surname}`.trim() || "Usuario"}
          loading={lazy ? "lazy" : "eager"}
          onError={(e) => {
            logger.warn("[UserAvatar] Error loading image, showing fallback")
            setHasError(true)
            // En caso de error, ocultar la imagen y mostrar fallback
            e.currentTarget.style.display = 'none'
          }}
        />
      )}
      <AvatarFallback className={cn(bgColor, fallbackClassName, isLoading && "opacity-50")}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

// ⚡ OPTIMIZACIÓN: React.memo previene re-renders innecesarios
// Solo se re-renderiza si photo, userId, name o surname cambian
export default React.memo(UserAvatar, (prevProps, nextProps) => {
  return (
    prevProps.photo === nextProps.photo &&
    prevProps.userId === nextProps.userId &&
    prevProps.name === nextProps.name &&
    prevProps.surname === nextProps.surname &&
    prevProps.fullName === nextProps.fullName &&
    prevProps.className === nextProps.className
  )
})