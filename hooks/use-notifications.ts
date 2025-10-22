"use client"

import { useState, useEffect, useCallback } from "react"
import { NotificacionAPI, NotificacionDTO } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export function useNotifications() {
  const [notificaciones, setNotificaciones] = useState<NotificacionDTO[]>([])
  const [noLeidas, setNoLeidas] = useState<NotificacionDTO[]>([])
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // Cargar todas las notificaciones
  const cargarNotificaciones = useCallback(async () => {
    try {
      const response = await NotificacionAPI.list()
      if (response.success) {
        setNotificaciones(response.data)
      }
    } catch (error) {
      console.error("[useNotifications] Error cargando notificaciones:", error)
    }
  }, [])

  // Cargar contador de no leídas
  const cargarContador = useCallback(async () => {
    try {
      const response = await NotificacionAPI.count()
      if (response.success) {
        setCount(response.data.count)
      }
    } catch (error) {
      console.error("[useNotifications] Error cargando contador:", error)
    }
  }, [])

  // Cargar notificaciones no leídas
  const cargarNoLeidas = useCallback(async () => {
    try {
      const response = await NotificacionAPI.getNoLeidas()
      if (response.success) {
        setNoLeidas(response.data)
      }
    } catch (error) {
      console.error("[useNotifications] Error cargando no leídas:", error)
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

  // Refrescar todo
  const refrescar = useCallback(async () => {
    setIsLoading(true)
    await Promise.all([
      cargarNotificaciones(),
      cargarContador(),
      cargarNoLeidas()
    ])
    setIsLoading(false)
  }, [cargarNotificaciones, cargarContador, cargarNoLeidas])

  // Cargar inicialmente
  useEffect(() => {
    refrescar()
  }, [refrescar])

  // Polling cada 30 segundos para actualizar contador
  useEffect(() => {
    const interval = setInterval(() => {
      cargarContador()
    }, 30000) // 30 segundos

    return () => clearInterval(interval)
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
