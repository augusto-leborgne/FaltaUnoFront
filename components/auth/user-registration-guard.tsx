"use client"
import React from "react"

interface UserRegistrationGuardProps {
  children: React.ReactNode
  userId?: string // Ahora es opcional
}

/**
 * GUARD DESHABILITADO - Solo pasa los children sin hacer nada
 * 
 * Las reseñas pendientes se manejan como notificaciones en HomeScreen
 * y NO bloquean la navegación del usuario.
 * 
 * Este componente se mantiene por compatibilidad pero no hace nada.
 */
export function UserRegistrationGuard({ children }: UserRegistrationGuardProps) {
  return <>{children}</>
}