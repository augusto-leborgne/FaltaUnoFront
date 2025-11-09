"use client"

import { useState, useEffect, useCallback } from "react"
import { NotificacionAPI, NotificacionDTO } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export function useNotifications() {
  const [notificaciones, setNotificaciones] = useState<NotificacionDTO[]>([])
  const [noLeidas, setNoLeidas] = useState<NotificacionDTO[]>([])
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false) // Cambiar a false para cargar en background
  const { toast } = useToast()

  // Cargar todas las notificaciones
  const cargarNotificaciones = useCallback(async () => {
    try {
      const response = await NotificacionAPI.list()
      if (response.success && Array.isArray(response.data)) {
        setNotificaciones(response.data)
      } else {
        setNotificaciones([]) // Fallback to empty array
      }
    } catch (error) {
      console.error("[useNotifications] Error cargando notificaciones:", error)
      setNotificaciones([]) // Fallback to empty array
    }
  }, [])

  // Cargar contador de no leídas (solo cuenta, muy rápido)
  const cargarContador = useCallback(async () => {
    try {
      const response = await NotificacionAPI.count()
      if (response.success) {
        setCount(response.data.count)
      } else {
        console.warn("[useNotifications] Error en respuesta del contador:", response.message)
      }
    } catch (error) {
      // Log error but don't spam console - retry logic in API handles this
      console.warn("[useNotifications] Error cargando contador:", error instanceof Error ? error.message : error)
    }
  }, [])

  // Cargar notificaciones no leídas
  const cargarNoLeidas = useCallback(async () => {
    try {
      const response = await NotificacionAPI.getNoLeidas()
      if (response.success && Array.isArray(response.data)) {
        setNoLeidas(response.data)
      } else {
        setNoLeidas([]) // Fallback to empty array
      }
    } catch (error) {
      console.error("[useNotifications] Error cargando no leídas:", error)
      setNoLeidas([]) // Fallback to empty array
    }
  }, [])

  // Marcar como leída
  const marcarComoLeida = useCallback(async (id: string) => {
    try {
      const response = await NotificacionAPI.marcarLeida(id)
      if (response.success) {
        // Actualizar estado local
        setNotificaciones(prev => 
          prev.map(n => n.id === id ? { ...n, leida: true } : n)
        )
        setNoLeidas(prev => prev.filter(n => n.id !== id))
        setCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("[useNotifications] Error marcando como leída:", error)
      toast({
        title: "Error",
        description: "No se pudo marcar la notificación como leída",
        variant: "destructive"
      })
    }
  }, [toast])

  // Marcar todas como leídas
  const marcarTodasLeidas = useCallback(async () => {
    try {
      const response = await NotificacionAPI.marcarTodasLeidas()
      if (response.success) {
        setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
        setNoLeidas([])
        setCount(0)
        toast({
          title: "Listo",
          description: "Todas las notificaciones marcadas como leídas"
        })
      }
    } catch (error) {
      console.error("[useNotifications] Error marcando todas como leídas:", error)
      toast({
        title: "Error",
        description: "No se pudieron marcar todas las notificaciones",
        variant: "destructive"
      })
    }
  }, [toast])

  // Eliminar notificación
  const eliminarNotificacion = useCallback(async (id: string) => {
    try {
      const notif = notificaciones.find(n => n.id === id)
      const response = await NotificacionAPI.eliminar(id)
      
      if (response.success) {
        setNotificaciones(prev => prev.filter(n => n.id !== id))
        setNoLeidas(prev => prev.filter(n => n.id !== id))
        if (notif && !notif.leida) {
          setCount(prev => Math.max(0, prev - 1))
        }
      }
    } catch (error) {
      console.error("[useNotifications] Error eliminando notificación:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la notificación",
        variant: "destructive"
      })
    }
  }, [notificaciones, toast])

  // Refrescar todo (sin bloquear UI)
  const refrescar = useCallback(async () => {
    // Cargar solo el contador primero (rápido)
    cargarContador()
    
    // Cargar el resto en background
    Promise.all([
      cargarNotificaciones(),
      cargarNoLeidas()
    ])
  }, [cargarNotificaciones, cargarContador, cargarNoLeidas])

  // Cargar inicialmente solo el contador
  useEffect(() => {
    cargarContador() // Rápido, solo número
    // Resto en background
    setTimeout(() => {
      cargarNotificaciones()
      cargarNoLeidas()
    }, 100)
  }, [])

  // Polling cada 2 minutos para actualizar contador (optimizado para reducir carga)
  useEffect(() => {
    const interval = setInterval(() => {
      // Solo hacer polling si el usuario está autenticado y la ventana está activa
      if (document.visibilityState === 'visible') {
        cargarContador()
      }
    }, 120000) // 2 minutos (aumentado desde 60 segundos)

    // Listener para visibilidad de página
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refrescar cuando la página vuelve a estar visible
        cargarContador()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [cargarContador])

  return {
    notificaciones,
    noLeidas,
    count,
    isLoading,
    marcarComoLeida,
    marcarTodasLeidas,
    eliminarNotificacion,
    refrescar
  }
}
