import { useCallback, useMemo, useRef, useEffect } from 'react'

/**
 * Hook para memoizar funciones de forma automática
 * Similar a useCallback pero más conveniente
 * 
 * @param fn - Función a memoizar
 * @returns Función memoizada
 * 
 * @example
 * ```tsx
 * const handleClick = useStableCallback((id: string) => {
 *   console.log('Clicked:', id)
 * })
 * ```
 */
export function useStableCallback<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef(fn)
  
  useEffect(() => {
    ref.current = fn
  }, [fn])
  
  return useCallback(((...args) => ref.current(...args)) as T, [])
}

/**
 * Hook para memoizar valores complejos de forma automática
 * Usa JSON.stringify para comparación profunda
 * 
 * @param value - Valor a memoizar
 * @returns Valor memoizado
 * 
 * @example
 * ```tsx
 * const filters = useDeepMemo({ name, age, city })
 * ```
 */
export function useDeepMemo<T>(value: T): T {
  return useMemo(() => value, [JSON.stringify(value)])
}

/**
 * Hook para prevenir re-renders innecesarios cuando las props no cambian
 * 
 * @param value - Valor a comparar
 * @returns true si el valor cambió
 * 
 * @example
 * ```tsx
 * const hasChanged = useHasChanged(props.user)
 * if (hasChanged) {
 *   // Solo ejecutar si realmente cambió
 * }
 * ```
 */
export function useHasChanged<T>(value: T): boolean {
  const prevRef = useRef<T>()
  const hasChanged = prevRef.current !== value
  
  useEffect(() => {
    prevRef.current = value
  }, [value])
  
  return hasChanged
}

/**
 * Hook para debounce automático de valores
 * 
 * @param value - Valor a hacer debounce
 * @param delay - Delay en ms (default: 500)
 * @returns Valor con debounce
 * 
 * @example
 * ```tsx
 * const searchTerm = useDebounce(input, 300)
 * 
 * useEffect(() => {
 *   // Solo se ejecuta 300ms después de que el usuario para de escribir
 *   fetchResults(searchTerm)
 * }, [searchTerm])
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])
  
  return debouncedValue
}

// Re-export useState para tenerlo junto con los otros hooks
import { useState } from 'react'
export { useState }
