import { NextResponse } from 'next/server'

/**
 * API endpoint que devuelve la versión actual del build
 * Se usa para detectar cuando hay un nuevo deploy y forzar recarga
 */
export async function GET() {
  // El buildId se genera en next.config.mjs usando timestamp
  // En producción, cada build tendrá un ID único
  const buildId = process.env.BUILD_ID || `build-${Date.now()}`
  
  return NextResponse.json(
    {
      buildId,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  )
}
