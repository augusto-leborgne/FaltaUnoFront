/**
 * API endpoint para métricas Prometheus
 * GET /api/metrics - Expone métricas en formato Prometheus
 */

import { NextRequest, NextResponse } from 'next/server'
import { metrics } from '@/lib/observability/metrics'

export async function GET(request: NextRequest) {
  try {
    // Export metrics in Prometheus format
    const prometheusMetrics = metrics.exportPrometheus()
    
    return new NextResponse(prometheusMetrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4',
      },
    })
  } catch (error) {
    console.error('Error exporting metrics:', error)
    return new NextResponse('Error exporting metrics', { status: 500 })
  }
}

// POST endpoint para recibir métricas de clientes
export async function POST(request: NextRequest) {
  // Este endpoint podría recibir métricas de múltiples clientes
  // y agregarlas para que Prometheus las scrape
  return new NextResponse('OK', { status: 200 })
}
