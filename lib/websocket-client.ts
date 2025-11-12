/**
 * WebSocket Client usando STOMP over SockJS
 * Proporciona conexión en tiempo real con el backend para actualizaciones instantáneas
 */

import { Client, IFrame, IMessage, StompConfig } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { logger } from './logger'

export type WebSocketEventType =
  | 'PARTIDO_UPDATED'
  | 'INSCRIPCION_CREATED'
  | 'INSCRIPCION_STATUS_CHANGED'
  | 'INSCRIPCION_CANCELLED'
  | 'PARTIDO_CANCELLED'
  | 'PARTIDO_COMPLETED'
  | 'NEW_MESSAGE'
  | 'USER_TYPING'

export interface WebSocketEvent {
  type: WebSocketEventType
  partidoId?: string
  inscripcion?: any
  partido?: any
  newStatus?: string
  reason?: string
  timestamp: number
  [key: string]: any
}

export type WebSocketCallback = (event: WebSocketEvent) => void

class WebSocketClient {
  private client: Client | null = null
  private subscriptions: Map<string, any> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 2000
  private isConnecting = false
  private connectionPromise: Promise<void> | null = null

  constructor() {
    // No conectar automáticamente, esperar a que se llame connect()
  }

  /**
   * Conectar al servidor WebSocket
   */
  async connect(): Promise<void> {
    // Si ya está conectando, retornar la promesa existente
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise
    }

    // Si ya está conectado, no hacer nada
    if (this.client?.connected) {
      logger.log('[WebSocket] Ya conectado')
      return Promise.resolve()
    }

    this.isConnecting = true

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // For SockJS, use HTTP/HTTPS URL (not WebSocket URL)
        const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || 'http://localhost:8080'
        const socketUrl = `${baseUrl}/ws`

        logger.log(`[WebSocket] Conectando a: ${socketUrl}`)

        // Configurar cliente STOMP
        const stompConfig: StompConfig = {
          webSocketFactory: () => {
            const sockjs = new SockJS(socketUrl, null, {
              transports: ['xhr-polling', 'xhr-streaming', 'eventsource']
            })
            return sockjs as any
          },
          
          connectHeaders: {},
          
          debug: (str: string) => {
            if (process.env.NODE_ENV === 'development') {
              logger.log(`[STOMP] ${str}`)
            }
          },
          
          reconnectDelay: this.reconnectDelay,
          heartbeatIncoming: 10000,
          heartbeatOutgoing: 10000,
          
          onConnect: (frame: IFrame) => {
            logger.log('[WebSocket] ✅ Conectado exitosamente')
            this.reconnectAttempts = 0
            this.isConnecting = false
            resolve()
          },
          
          onDisconnect: (frame: IFrame) => {
            logger.log('[WebSocket] ⚠️ Desconectado')
            this.isConnecting = false
          },
          
          onStompError: (frame: IFrame) => {
            logger.error('[WebSocket] ❌ Error STOMP:', frame)
            this.isConnecting = false
            reject(new Error(`STOMP error: ${frame.headers?.message || 'Unknown error'}`))
          },
          
          onWebSocketError: (event: Event) => {
            logger.error('[WebSocket] ❌ Error WebSocket:', event)
            this.isConnecting = false
            reject(new Error('WebSocket connection failed'))
          },
          
          onWebSocketClose: (event: CloseEvent) => {
            logger.log('[WebSocket] Conexión cerrada:', event.code, event.reason)
            this.isConnecting = false
            
            // Intentar reconectar
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.reconnectAttempts++
              const delay = this.reconnectDelay * this.reconnectAttempts
              logger.log(`[WebSocket] Reintentando en ${delay}ms (intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
              
              setTimeout(() => {
                this.connect().catch(err => {
                  logger.error('[WebSocket] Error en reconexión:', err)
                })
              }, delay)
            }
          },
        }

        this.client = new Client(stompConfig)
        this.client.activate()

      } catch (error) {
        this.isConnecting = false
        logger.error('[WebSocket] Error creando cliente:', error)
        reject(error)
      }
    })

    return this.connectionPromise
  }

  /**
   * Desconectar del servidor
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      // Desuscribir todas las suscripciones
      this.subscriptions.forEach((subscription, key) => {
        try {
          subscription.unsubscribe()
        } catch (error) {
          logger.error(`[WebSocket] Error desuscribiendo ${key}:`, error)
        }
      })
      this.subscriptions.clear()

      // Desactivar cliente
      await this.client.deactivate()
      this.client = null
      logger.log('[WebSocket] ✅ Desconectado')
    }
  }

  /**
   * Suscribirse a actualizaciones de un partido específico
   */
  async subscribeToPartido(partidoId: string, callback: WebSocketCallback): Promise<() => void> {
    await this.connect()

    if (!this.client?.connected) {
      throw new Error('WebSocket no conectado')
    }

    const destination = `/topic/partidos/${partidoId}`
    const subscriptionKey = `partido-${partidoId}`

    // Si ya existe una suscripción, desuscribir primero
    if (this.subscriptions.has(subscriptionKey)) {
      this.subscriptions.get(subscriptionKey).unsubscribe()
    }

    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const event: WebSocketEvent = JSON.parse(message.body)
        logger.log(`[WebSocket] 📨 Evento recibido:`, event.type, event)
        callback(event)
      } catch (error) {
        logger.error('[WebSocket] Error procesando mensaje:', error)
      }
    })

    this.subscriptions.set(subscriptionKey, subscription)
    logger.log(`[WebSocket] ✅ Suscrito a: ${destination}`)

    // Retornar función para desuscribirse
    return () => {
      subscription.unsubscribe()
      this.subscriptions.delete(subscriptionKey)
      logger.log(`[WebSocket] ✅ Desuscrito de: ${destination}`)
    }
  }

  /**
   * Suscribirse al chat de un partido
   */
  async subscribeToPartidoChat(partidoId: string, callback: WebSocketCallback): Promise<() => void> {
    await this.connect()

    if (!this.client?.connected) {
      throw new Error('WebSocket no conectado')
    }

    const destination = `/topic/partidos/${partidoId}/chat`
    const subscriptionKey = `chat-${partidoId}`

    if (this.subscriptions.has(subscriptionKey)) {
      this.subscriptions.get(subscriptionKey).unsubscribe()
    }

    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const event: WebSocketEvent = JSON.parse(message.body)
        logger.log(`[WebSocket] 💬 Mensaje de chat:`, event.type, event)
        callback(event)
      } catch (error) {
        logger.error('[WebSocket] Error procesando mensaje de chat:', error)
      }
    })

    this.subscriptions.set(subscriptionKey, subscription)
    logger.log(`[WebSocket] ✅ Suscrito al chat: ${destination}`)

    return () => {
      subscription.unsubscribe()
      this.subscriptions.delete(subscriptionKey)
      logger.log(`[WebSocket] ✅ Desuscrito del chat: ${destination}`)
    }
  }

  /**
   * Suscribirse a notificaciones personales
   */
  async subscribeToUserNotifications(userId: string, callback: WebSocketCallback): Promise<() => void> {
    await this.connect()

    if (!this.client?.connected) {
      throw new Error('WebSocket no conectado')
    }

    const destination = `/user/${userId}/queue/notifications`
    const subscriptionKey = `user-${userId}`

    if (this.subscriptions.has(subscriptionKey)) {
      this.subscriptions.get(subscriptionKey).unsubscribe()
    }

    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const event: WebSocketEvent = JSON.parse(message.body)
        logger.log(`[WebSocket] 📨 Notificación personal:`, event.type, event)
        callback(event)
      } catch (error) {
        logger.error('[WebSocket] Error procesando notificación:', error)
      }
    })

    this.subscriptions.set(subscriptionKey, subscription)
    logger.log(`[WebSocket] ✅ Suscrito a notificaciones: ${destination}`)

    return () => {
      subscription.unsubscribe()
      this.subscriptions.delete(subscriptionKey)
      logger.log(`[WebSocket] ✅ Desuscrito de notificaciones`)
    }
  }

  /**
   * Verificar si está conectado
   */
  isConnected(): boolean {
    return this.client?.connected || false
  }

  /**
   * Obtener estado de conexión
   */
  getConnectionState(): 'connected' | 'connecting' | 'disconnected' {
    if (this.client?.connected) return 'connected'
    if (this.isConnecting) return 'connecting'
    return 'disconnected'
  }

  /**
   * Enviar evento de "usuario está escribiendo"
   */
  sendTyping(partidoId: string, isTyping: boolean): void {
    if (!this.client?.connected) {
      logger.warn('[WebSocket] No conectado, no se puede enviar typing event')
      return
    }

    try {
      this.client.publish({
        destination: `/app/partidos/${partidoId}/typing`,
        body: JSON.stringify({ isTyping })
      })
      logger.log(`[WebSocket] Typing event enviado: ${isTyping}`)
    } catch (error) {
      logger.error('[WebSocket] Error enviando typing event:', error)
    }
  }
}

// Singleton instance
export const webSocketClient = new WebSocketClient()
