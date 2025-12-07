/**
 * Hook para suscribirse a actualizaciones en tiempo real de un partido
 * Conecta automáticamente WebSocket y maneja reconexiones
 */

import { useEffect, useRef, useCallback } from 'react'
import { webSocketClient, WebSocketEvent, WebSocketCallback } from '@/lib/websocket-client'
import { logger } from '@/lib/logger'

interface UseWebSocketOptions {
  /**
   * ID del partido al que suscribirse
   */
  partidoId?: string
  
  /**
   * Callback cuando se recibe un evento
   */
  onEvent?: WebSocketCallback
  
  /**
   * Si el hook debe conectarse automáticamente (default: true)
   */
  enabled?: boolean
  
  /**
   * Reconectar automáticamente en caso de desconexión (default: true)
   */
  autoReconnect?: boolean
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    partidoId,
    onEvent,
    enabled = true,
    autoReconnect = true,
  } = options

  const unsubscribeRef = useRef<(() => void) | null>(null)
  const onEventRef = useRef(onEvent)

  // Actualizar ref cuando cambie el callback
  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  // Función estable de callback
  const stableCallback = useCallback((event: WebSocketEvent) => {
    onEventRef.current?.(event)
  }, [])

  // Conectar y suscribirse
  useEffect(() => {
    if (!enabled || !partidoId) {
      return
    }

    let active = true

    const subscribe = async () => {
      try {
        logger.log(`[useWebSocket] Suscribiendo a partido: ${partidoId}`)
        
        // Suscribirse al partido
        const unsubscribe = await webSocketClient.subscribeToPartido(
          partidoId,
          stableCallback
        )

        // Guardar función de desuscripción
        if (active) {
          unsubscribeRef.current = unsubscribe
        } else {
          // Si el componente se desmontó durante la conexión, desuscribir inmediatamente
          unsubscribe()
        }
      } catch (error) {
        logger.error('[useWebSocket] Error suscribiendo:', error)
        
        // Reintentar si autoReconnect está habilitado
        if (autoReconnect && active) {
          setTimeout(() => {
            if (active) {
              subscribe()
            }
          }, 3000)
        }
      }
    }

    subscribe()

    // Cleanup
    return () => {
      active = false
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [partidoId, enabled, autoReconnect, stableCallback])

  return {
    isConnected: webSocketClient.isConnected(),
    connectionState: webSocketClient.getConnectionState(),
    disconnect: () => webSocketClient.disconnect(),
  }
}

/**
 * Hook para suscribirse a notificaciones personales del usuario
 */
export function useUserNotifications(userId?: string, onNotification?: WebSocketCallback) {
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const onNotificationRef = useRef(onNotification)

  useEffect(() => {
    onNotificationRef.current = onNotification
  }, [onNotification])

  const stableCallback = useCallback((event: WebSocketEvent) => {
    onNotificationRef.current?.(event)
  }, [])

  useEffect(() => {
    if (!userId) {
      return
    }

    let active = true

    const subscribe = async () => {
      try {
        logger.log(`[useUserNotifications] Suscribiendo a notificaciones de usuario: ${userId}`)
        
        const unsubscribe = await webSocketClient.subscribeToUserNotifications(
          userId,
          stableCallback
        )

        if (active) {
          unsubscribeRef.current = unsubscribe
        } else {
          unsubscribe()
        }
      } catch (error) {
        logger.error('[useUserNotifications] Error suscribiendo:', error)
      }
    }

    subscribe()

    return () => {
      active = false
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [userId, stableCallback])

  return {
    isConnected: webSocketClient.isConnected(),
    connectionState: webSocketClient.getConnectionState(),
  }
}

/**
 * Hook para suscribirse al chat de un partido (mensajes en tiempo real)
 */
export function usePartidoChat(partidoId?: string, onMessage?: WebSocketCallback) {
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  const stableCallback = useCallback((event: WebSocketEvent) => {
    onMessageRef.current?.(event)
  }, [])

  useEffect(() => {
    if (!partidoId) {
      return
    }

    let active = true

    const subscribe = async () => {
      try {
        logger.log(`[usePartidoChat] Suscribiendo al chat del partido: ${partidoId}`)
        
        const unsubscribe = await webSocketClient.subscribeToPartidoChat(
          partidoId,
          stableCallback
        )

        if (active) {
          unsubscribeRef.current = unsubscribe
        } else {
          unsubscribe()
        }
      } catch (error) {
        logger.error('[usePartidoChat] Error suscribiendo:', error)
        
        // Reintentar en 3 segundos si falla
        if (active) {
          setTimeout(() => {
            if (active) {
              subscribe()
            }
          }, 3000)
        }
      }
    }

    subscribe()

    return () => {
      active = false
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [partidoId, stableCallback])

  return {
    isConnected: webSocketClient.isConnected(),
    connectionState: webSocketClient.getConnectionState(),
  }
}

/**
 * Hook para suscribirse a eventos globales de partidos (creación, cancelación)
 * Útil para actualizar listas de partidos en tiempo real
 */
export function useGlobalPartidos(onEvent?: WebSocketCallback) {
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const onEventRef = useRef(onEvent)

  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  const stableCallback = useCallback((event: WebSocketEvent) => {
    onEventRef.current?.(event)
  }, [])

  useEffect(() => {
    let active = true

    const subscribe = async () => {
      try {
        logger.log('[useGlobalPartidos] Suscribiendo a eventos globales de partidos')
        
        const unsubscribe = await webSocketClient.subscribeToGlobalPartidos(stableCallback)

        if (active) {
          unsubscribeRef.current = unsubscribe
        } else {
          unsubscribe()
        }
      } catch (error) {
        logger.error('[useGlobalPartidos] Error suscribiendo:', error)
      }
    }

    subscribe()

    return () => {
      active = false
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [stableCallback])

  return {
    isConnected: webSocketClient.isConnected(),
    connectionState: webSocketClient.getConnectionState(),
  }
}
