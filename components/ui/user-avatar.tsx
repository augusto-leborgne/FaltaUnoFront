// components/ui/user-avatar.tsx
"use client"

import React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  /** Base64 encoded photo string (with or without data URI prefix) */
  photo?: string | null
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
}

/**
 * UserAvatar - Componente reutilizable para mostrar avatares de usuario
 * 
 * Maneja automáticamente:
 * - Fotos en base64 con o sin prefijo data:image
 * - Iniciales calculadas desde nombre/apellido o fullName
 * - Fallback con iniciales estilizadas
 * 
 * @example
 * ```tsx
 * // Con objeto usuario completo
 * <UserAvatar 
 *   photo={user.foto_perfil}
 *   name={user.nombre}
 *   surname={user.apellido}
 *   className="w-12 h-12"
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
  name,
  surname,
  fullName,
  className,
  fallbackClassName,
  onClick,
}: UserAvatarProps): JSX.Element {
  
  // Normalizar la foto a data URI si es necesario
  const normalizedPhoto = React.useMemo(() => {
    if (!photo) return null
    
    // Si ya tiene el prefijo data:image, usarla directamente
    if (photo.startsWith('data:image')) {
      return photo
    }
    
    // Si es base64 sin prefijo, agregar el prefijo
    return `data:image/jpeg;base64,${photo}`
  }, [photo])

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
      className={cn(className, onClick && "cursor-pointer hover:opacity-80 transition-opacity")}
      onClick={onClick}
    >
      {normalizedPhoto && (
        <AvatarImage 
          src={normalizedPhoto} 
          alt={fullName || `${name} ${surname}`.trim() || "Usuario"}
          onError={(e) => {
            console.warn("[UserAvatar] Error loading image, showing fallback")
            // En caso de error, ocultar la imagen y mostrar fallback
            e.currentTarget.style.display = 'none'
          }}
        />
      )}
      <AvatarFallback className={cn(bgColor, fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

// Export default for compatibility
export default UserAvatar