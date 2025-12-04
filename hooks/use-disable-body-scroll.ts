import { useEffect } from 'react'

/**
 * Hook para deshabilitar el scroll del body cuando se muestra un modal u overlay
 * Evita el scroll indeseable del fondo cuando hay contenido modal visible
 * 
 * @param isOpen - Indica si el modal/overlay está abierto
 */
export function useDisableBodyScroll(isOpen: boolean) {
  useEffect(() => {
    if (isOpen) {
      // Guardar el scroll actual
      const scrollY = window.scrollY
      
      // Aplicar estilos para deshabilitar scroll
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      
      return () => {
        // Restaurar estilos originales
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        
        // Restaurar posición de scroll
        window.scrollTo(0, scrollY)
      }
    }
  }, [isOpen])
}
