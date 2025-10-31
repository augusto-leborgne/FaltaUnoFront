import { NextResponse } from 'next/server'

/**
 * API endpoint que devuelve la versión actual del build
 * Se usa para detectar cuando hay un nuevo deploy y forzar recarga
 */
export async function GET() {
  // El buildId se genera usando BUILD_ID (timestamp del build en Docker)
  // O NEXT_PUBLIC_BUILD_ID que está disponible en runtime
  const buildId = process.env.BUILD_ID || 
                  process.env.NEXT_PUBLIC_BUILD_ID ||
                  `build-${Date.now()}`
  
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
