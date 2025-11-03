/**
 * Fetch con timeout automático para evitar requests colgados
 * 
 * @param url - URL a fetchear
 * @param options - Opciones de fetch
 * @param timeoutMs - Timeout en milisegundos (default: 30000 = 30s)
 * @returns Promise con Response
 * 
 * @example
 * ```ts
 * const response = await fetchWithTimeout('/api/users', {
 *   method: 'GET',
 *   headers: { 'Authorization': 'Bearer token' }
 * }, 10000) // 10 segundos timeout
 * ```
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`)
    }
    throw error
  }
}

/**
 * Fetch con retry automático y timeout
 * 
 * @param url - URL a fetchear
 * @param options - Opciones de fetch
 * @param config - Configuración de retry y timeout
 * @returns Promise con Response
 * 
 * @example
 * ```ts
 * const response = await fetchWithRetry('/api/users', {
 *   method: 'GET'
 * }, {
 *   maxRetries: 3,
 *   timeoutMs: 10000,
 *   retryDelay: 1000
 * })
 * ```
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  config: {
    maxRetries?: number
    timeoutMs?: number
    retryDelay?: number
    retryableStatusCodes?: number[]
  } = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    timeoutMs = 30000,
    retryDelay = 1000,
    retryableStatusCodes = [408, 429, 500, 502, 503, 504],
  } = config

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs)

      // Si la respuesta es exitosa O no es retryable, devolverla
      if (response.ok || !retryableStatusCodes.includes(response.status)) {
        return response
      }

      // Si es el último intento, devolver la respuesta (aunque sea error)
      if (attempt === maxRetries) {
        return response
      }

      // Esperar antes del próximo retry
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Si es el último intento, lanzar el error
      if (attempt === maxRetries) {
        throw lastError
      }

      // Esperar antes del próximo retry
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
    }
  }

  // Nunca debería llegar aquí, pero por si acaso
  throw lastError || new Error('Max retries reached')
}
