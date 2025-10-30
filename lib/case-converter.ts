/**
 * Utility functions for converting between snake_case and camelCase
 * Used to normalize data between backend (snake_case) and frontend (camelCase)
 */

/**
 * Convert string from snake_case to camelCase
 * @example toCamelCase('user_name') => 'userName'
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Convert string from camelCase to snake_case
 * @example toSnakeCase('userName') => 'user_name'
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/**
 * Convert object keys from snake_case to camelCase
 * @param obj Object with snake_case keys
 * @returns New object with camelCase keys
 */
export function keysToCamelCase<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => keysToCamelCase(item)) as T
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const converted: any = {}
    
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = toCamelCase(key)
      converted[camelKey] = keysToCamelCase(value)
    }
    
    return converted as T
  }

  return obj
}

/**
 * Convert object keys from camelCase to snake_case
 * @param obj Object with camelCase keys
 * @returns New object with snake_case keys
 */
export function keysToSnakeCase<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => keysToSnakeCase(item)) as T
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const converted: any = {}
    
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = toSnakeCase(key)
      converted[snakeKey] = keysToSnakeCase(value)
    }
    
    return converted as T
  }

  return obj
}

/**
 * Create an object with both snake_case and camelCase keys
 * Useful for backend compatibility during transition
 * @param obj Source object (can have either naming convention)
 * @returns Object with both naming conventions
 */
export function dualCaseKeys<T extends Record<string, any>>(obj: T): T & Record<string, any> {
  const result: any = { ...obj }
  
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key)
    const snakeKey = toSnakeCase(key)
    
    // Add both versions if they're different
    if (camelKey !== key) {
      result[camelKey] = value
    }
    if (snakeKey !== key) {
      result[snakeKey] = value
    }
  }
  
  return result
}

/**
 * Normalize object by preferring camelCase but keeping snake_case as fallback
 * @param obj Object that may have mixed naming conventions
 * @param preferSnakeCase If true, prefer snake_case over camelCase (default: false)
 * @returns Object with preferred naming convention
 */
export function normalizeKeys<T = any>(obj: any, preferSnakeCase = false): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => normalizeKeys(item, preferSnakeCase)) as T
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const normalized: any = {}
    const processedKeys = new Set<string>()
    
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = toCamelCase(key)
      const snakeKey = toSnakeCase(key)
      
      // Skip if we've already processed this key's alternate form
      if (processedKeys.has(key)) continue
      
      const preferredKey = preferSnakeCase ? snakeKey : camelKey
      
      // Mark both forms as processed
      processedKeys.add(camelKey)
      processedKeys.add(snakeKey)
      
      // Use the preferred key
      normalized[preferredKey] = normalizeKeys(value, preferSnakeCase)
    }
    
    return normalized as T
  }

  return obj
}
