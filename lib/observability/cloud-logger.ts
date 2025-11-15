/**
 * Cloud Logger - Envía logs estructurados a Google Cloud Logging
 * En desarrollo: console.log
 * En producción: Cloud Logging con formato JSON
 */

const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

// Severity levels según Google Cloud Logging
export enum LogSeverity {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  NOTICE = 'NOTICE',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
  ALERT = 'ALERT',
  EMERGENCY = 'EMERGENCY',
}

interface LogEntry {
  severity: LogSeverity
  message: string
  timestamp: string
  // Structured data
  labels?: Record<string, string>
  // Additional context
  context?: {
    userId?: string
    sessionId?: string
    path?: string
    userAgent?: string
    [key: string]: any
  }
  // Stack trace for errors
  stack?: string
  // Additional metadata
  metadata?: Record<string, any>
}

class CloudLogger {
  private sessionId: string
  private userId?: string

  constructor() {
    // Generate session ID
    this.sessionId = this.generateSessionId()
    
    // Try to get user ID from localStorage
    if (typeof window !== 'undefined') {
      try {
        const userStr = localStorage.getItem('user')
        if (userStr) {
          const user = JSON.parse(userStr)
          this.userId = user.id
        }
      } catch {}
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private getContext(): LogEntry['context'] {
    if (typeof window === 'undefined') return {}

    return {
      userId: this.userId,
      sessionId: this.sessionId,
      path: window.location.pathname,
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    }
  }

  private createLogEntry(
    severity: LogSeverity,
    message: string,
    metadata?: Record<string, any>,
    error?: Error
  ): LogEntry {
    return {
      severity,
      message,
      timestamp: new Date().toISOString(),
      context: this.getContext(),
      metadata,
      stack: error?.stack,
    }
  }

  private sendToCloudLogging(entry: LogEntry): void {
    if (!isProduction) return

    // En producción, enviar a Cloud Logging vía API endpoint
    // Esto se puede hacer de varias formas:
    // 1. Fetch a tu backend que reenvía a Cloud Logging
    // 2. Cloud Run automáticamente captura console.log en formato JSON
    // 3. Cliente de Cloud Logging (requiere auth)

    // Opción recomendada: console.log JSON estructurado
    // Cloud Run lo captura automáticamente
    console.log(JSON.stringify(entry))
  }

  /**
   * Log level DEBUG
   */
  debug(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogSeverity.DEBUG, message, metadata)
    
    if (isDevelopment) {
      console.debug('🐛', message, metadata)
    } else {
      this.sendToCloudLogging(entry)
    }
  }

  /**
   * Log level INFO
   */
  info(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogSeverity.INFO, message, metadata)
    
    if (isDevelopment) {
      console.log('ℹ️', message, metadata)
    } else {
      this.sendToCloudLogging(entry)
    }
  }

  /**
   * Log level WARNING
   */
  warn(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogSeverity.WARNING, message, metadata)
    
    if (isDevelopment) {
      console.warn('⚠️', message, metadata)
    } else {
      this.sendToCloudLogging(entry)
    }
  }

  /**
   * Log level ERROR
   */
  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogSeverity.ERROR, message, metadata, error)
    
    if (isDevelopment) {
      console.error('❌', message, error, metadata)
    } else {
      this.sendToCloudLogging(entry)
    }
  }

  /**
   * Log level CRITICAL - Errores críticos que requieren atención inmediata
   */
  critical(message: string, error?: Error, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogSeverity.CRITICAL, message, metadata, error)
    
    // Critical logs siempre se imprimen
    console.error('🚨 CRITICAL:', message, error, metadata)
    
    if (isProduction) {
      this.sendToCloudLogging(entry)
    }
  }

  /**
   * Actualizar userId cuando el usuario hace login
   */
  setUserId(userId: string | undefined): void {
    this.userId = userId
  }

  /**
   * Backward compatibility - mantener la API del logger anterior
   */
  log(...args: any[]): void {
    if (args.length === 0) return
    
    const message = typeof args[0] === 'string' ? args[0] : JSON.stringify(args[0])
    const metadata = args.slice(1).length > 0 ? { args: args.slice(1) } : undefined
    
    this.info(message, metadata)
  }

  /**
   * Group logs (solo en desarrollo)
   */
  group(label: string): void {
    if (isDevelopment) {
      console.group(label)
    }
  }

  /**
   * End group (solo en desarrollo)
   */
  groupEnd(): void {
    if (isDevelopment) {
      console.groupEnd()
    }
  }

  /**
   * Table (solo en desarrollo)
   */
  table(data: any): void {
    if (isDevelopment) {
      console.table(data)
    }
  }
}

// Export singleton instance
export const cloudLogger = new CloudLogger()

// Export as default para compatibilidad
export default cloudLogger
