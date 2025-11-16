/**
 * API endpoint para métricas Prometheus
 * POST /api/metrics - Recibe métricas del frontend y las guarda
 * GET /api/metrics - Expone las últimas métricas para scraping
 */

import { NextRequest, NextResponse } from 'next/server'

// Almacenar las últimas métricas en memoria
let latestMetrics = ''
let lastUpdate = 0

// POST endpoint para recibir métricas del frontend
export async function POST(request: NextRequest) {
  try {
    const metricsText = await request.text()
    
    if (!metricsText || metricsText.trim().length === 0) {
      return new NextResponse('No metrics data', { status: 400 })
    }

    // Guardar métricas en memoria
    latestMetrics = metricsText
    lastUpdate = Date.now()
    
    console.log('[Metrics] Updated', metricsText.split('\n').length, 'metric lines')
    
    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('[Metrics] Error processing metrics:', error)
    return new NextResponse('Internal error', { status: 500 })
  }
}

// GET endpoint para exponer métricas en formato Prometheus
export async function GET(request: NextRequest) {
  const age = Date.now() - lastUpdate
  console.log('[Metrics] Serving metrics (age:', Math.round(age/1000), 'seconds)')
  
  return new NextResponse(latestMetrics, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4',
    },
  })
}
