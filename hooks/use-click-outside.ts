import { useEffect, RefObject } from 'react'

/**
 * Hook para detectar clicks fuera de un elemento
 * Útil para cerrar dropdowns, modals, etc.
 * 
 * @param ref - Referencia al elemento que queremos proteger
 * @param handler - Función que se ejecuta al hacer click fuera
 * @param enabled - Si el hook está activo (default: true)
 * 
 * @example
 * ```tsx
 * const dropdownRef = useRef<HTMLDivElement>(null);
 * useClickOutside(dropdownRef, () => setIsOpen(false));
 * 
 * return (
 *   <div ref={dropdownRef}>
 *     ...
 *   </div>
 * );
 * ```
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return

    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref.current
      
      // No hacer nada si el click fue dentro del elemento
      if (!el || el.contains(event.target as Node)) {
        return
      }

      // Click fuera del elemento - ejecutar handler
      handler(event)
    }

    // Escuchar ambos eventos para mejor soporte móvil
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)

    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler, enabled])
}
