import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * MIDDLEWARE DESHABILITADO
 * 
 * El middleware estaba causando problemas:
 * - Cerraba sesión al navegar entre páginas
 * - No podía leer cookies correctamente
 * - Interfería con la autenticación normal
 * 
 * La protección de rutas se maneja completamente en client-side
 * con el componente ProtectedRoute en ClientLayout
 */

export function middleware(request: NextRequest) {
  // Simplemente permitir todas las requests
  return NextResponse.next()
}

// Configurar para que NO intercepte ninguna ruta
export const config = {
  matcher: [],
}
