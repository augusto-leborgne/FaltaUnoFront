/**
 * API endpoint para métricas Prometheus
 * POST /api/metrics - Recibe métricas del browser y las almacena
 * GET /api/metrics - Expone las métricas almacenadas para scraping
 */

import { NextRequest, NextResponse } from 'next/server'

// Almacenar métricas en memoria global (compartido entre requests)
let cachedMetrics = ''
let lastUpdate = 0

// POST endpoint para recibir métricas del browser
export async function POST(request: NextRequest) {
  try {
    const metricsText = await request.text()
    
    if (metricsText && metricsText.trim().length > 0) {
      cachedMetrics = metricsText
      lastUpdate = Date.now()
    }
    
    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('[Metrics] Error receiving metrics:', error)
    return new NextResponse('OK', { status: 200 })
  }
}

// GET endpoint para exponer métricas en formato Prometheus
export async function GET(request: NextRequest) {
  return new NextResponse(cachedMetrics, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
