/**
 * Logger condicional que solo imprime en desarrollo.
 * Usa process.env.NODE_ENV para determinar el entorno.
 */

const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  /**
   * Loguear información (solo en desarrollo)
   */
  log: (...args: any[]): void => {
    if (isDevelopment) {
      console.log(...args)
    }
  },

  /**
   * Loguear información con prefijo (solo en desarrollo)
   */
  info: (message: string, ...args: any[]): void => {
    if (isDevelopment) {
      console.log(`ℹ️ ${message}`, ...args)
    }
  },

  /**
   * Loguear advertencia (solo en desarrollo)
   */
  warn: (message: string, ...args: any[]): void => {
    if (isDevelopment) {
      console.warn(`⚠️ ${message}`, ...args)
    }
  },

  /**
   * Loguear error (siempre, incluso en producción)
   * Los errores son críticos y deben ser visibles
   */
  error: (message: string, ...args: any[]): void => {
    console.error(`❌ ${message}`, ...args)
  },

  /**
   * Loguear debug detallado (solo en desarrollo)
   */
  debug: (...args: any[]): void => {
    if (isDevelopment) {
      console.debug('🐛', ...args)
    }
  },

  /**
   * Agrupar logs relacionados (solo en desarrollo)
   */
  group: (label: string): void => {
    if (isDevelopment) {
      console.group(label)
    }
  },

  /**
   * Cerrar grupo de logs (solo en desarrollo)
   */
  groupEnd: (): void => {
    if (isDevelopment) {
      console.groupEnd()
    }
  },

  /**
   * Loguear tabla (solo en desarrollo)
   */
  table: (data: any): void => {
    if (isDevelopment) {
      console.table(data)
    }
  },
}

export default logger
