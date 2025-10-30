/**
 * Utilidad central de manejo de errores para toda la aplicación
 * Garantiza que ningún error afecte la funcionalidad general
 */

import { ApiResponse } from './api'

/**
 * Tipos de errores reconocidos
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Clasificar error basado en mensaje o código
 */
export function classifyError(error: any): ErrorType {
  if (!error) return ErrorType.UNKNOWN

  const message = error.message?.toLowerCase() || error.toString().toLowerCase()
  
  if (message.includes('network') || message.includes('fetch') || message.includes('conexión')) {
    return ErrorType.NETWORK
  }
  
  if (message.includes('401') || message.includes('sesión') || message.includes('token')) {
    return ErrorType.AUTHENTICATION
  }
  
  if (message.includes('403') || message.includes('permisos') || message.includes('autorizado')) {
    return ErrorType.AUTHORIZATION
  }
  
  if (message.includes('404') || message.includes('no encontrado')) {
    return ErrorType.NOT_FOUND
  }
  
  if (message.includes('500') || message.includes('servidor')) {
    return ErrorType.SERVER
  }
  
  if (message.includes('validación') || message.includes('inválid')) {
    return ErrorType.VALIDATION
  }
  
  return ErrorType.UNKNOWN
}

/**
 * Obtener mensaje de error amigable para el usuario
 */
export function getUserFriendlyMessage(error: any, context?: string): string {
  const errorType = classifyError(error)
  const contextMsg = context ? ` ${context}` : ''
  
  switch (errorType) {
    case ErrorType.NETWORK:
      return `Error de conexión${contextMsg}. Verifica tu internet e intenta nuevamente.`
    
    case ErrorType.AUTHENTICATION:
      return `Sesión expirada${contextMsg}. Por favor inicia sesión nuevamente.`
    
    case ErrorType.AUTHORIZATION:
      return `No tienes permisos${contextMsg}. Contacta al administrador si crees que es un error.`
    
    case ErrorType.NOT_FOUND:
      return `Recurso no encontrado${contextMsg}. Puede haber sido eliminado.`
    
    case ErrorType.SERVER:
      return `Error del servidor${contextMsg}. Intenta nuevamente en unos momentos.`
    
    case ErrorType.VALIDATION:
      return error.message || `Datos inválidos${contextMsg}. Verifica la información.`
    
    default:
      return error.message || `Error inesperado${contextMsg}. Por favor intenta nuevamente.`
  }
}

/**
 * Wrapper universal para funciones asíncronas con manejo de errores
 * Garantiza que NUNCA se lance un error sin capturar
 */
export async function safeAsync<T>(
  fn: () => Promise<ApiResponse<T>>,
  context?: string,
  fallbackData?: T
): Promise<ApiResponse<T>> {
  try {
    const result = await fn()
    return result
  } catch (error: any) {
    console.error(`[SafeAsync${context ? ` - ${context}` : ''}] Error capturado:`, error)
    
    return {
      success: false,
      data: (fallbackData ?? null) as T,
      message: getUserFriendlyMessage(error, context),
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Wrapper para funciones síncronas con manejo de errores
 */
export function safeSync<T>(
  fn: () => T,
  fallback: T,
  context?: string
): T {
  try {
    return fn()
  } catch (error: any) {
    console.error(`[SafeSync${context ? ` - ${context}` : ''}] Error capturado:`, error)
    return fallback
  }
}

/**
 * Wrapper para operaciones void (sin retorno) con manejo de errores
 */
export async function safeVoid(
  fn: () => Promise<void>,
  context?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await fn()
    return { success: true }
  } catch (error: any) {
    console.error(`[SafeVoid${context ? ` - ${context}` : ''}] Error capturado:`, error)
    return {
      success: false,
      error: getUserFriendlyMessage(error, context)
    }
  }
}

/**
 * Log error de forma segura (para debugging)
 */
export function logError(error: any, context?: string) {
  const errorType = classifyError(error)
  const timestamp = new Date().toISOString()
  
  console.error(`
╔════════════════════════════════════════════════════════════
║ ERROR CAPTURADO
╠════════════════════════════════════════════════════════════
║ Timestamp: ${timestamp}
║ Context: ${context || 'N/A'}
║ Type: ${errorType}
║ Message: ${error?.message || error}
╠════════════════════════════════════════════════════════════
║ Stack:
${error?.stack || 'No stack trace available'}
╚════════════════════════════════════════════════════════════
  `)
}

/**
 * Retry automático con backoff exponencial
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    backoffMultiplier?: number
    context?: string
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    context
  } = options

  let lastError: any
  let delay = initialDelay

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      
      if (attempt === maxRetries) {
        logError(error, `${context} - Max retries (${maxRetries}) reached`)
        throw error
      }

      console.warn(
        `[Retry${context ? ` - ${context}` : ''}] ` +
        `Attempt ${attempt}/${maxRetries} failed. Retrying in ${delay}ms...`
      )

      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, delay))
      
      // Incrementar delay con backoff exponencial
      delay = Math.min(delay * backoffMultiplier, maxDelay)
    }
  }

  throw lastError
}
