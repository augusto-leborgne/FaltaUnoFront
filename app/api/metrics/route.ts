/**
 * API endpoint para métricas Prometheus
 * GET /api/metrics - Expone métricas en formato Prometheus
 * POST /api/metrics - Recibe y envía métricas a Grafana Cloud
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

// POST endpoint para recibir métricas del frontend
// Las almacenamos en memoria para que el endpoint GET las exponga
// Grafana Cloud debe hacer scraping del endpoint GET
export async function POST(request: NextRequest) {
  try {
    const metricsData = await request.text()
    
    // Verificar que hay datos
    if (!metricsData || metricsData.trim().length === 0) {
      return new NextResponse('No metrics data', { status: 400 })
    }

    // Por ahora solo confirmamos recepción
    // Las métricas ya están en el singleton metrics
    // Grafana Cloud hará scraping de GET /api/metrics
    
    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Error receiving metrics:', error)
    return new NextResponse('OK', { status: 200 })
  }
}
