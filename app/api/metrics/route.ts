/**
 * API endpoint para métricas Prometheus
 * GET /api/metrics - Expone las métricas del browser para scraping externo
 */

import { NextRequest, NextResponse } from 'next/server'
import { metrics } from '@/lib/observability/metrics'

// GET endpoint para exponer métricas en formato Prometheus
export async function GET(request: NextRequest) {
  try {
    const prometheusMetrics = metrics.exportPrometheus()
    
    return new NextResponse(prometheusMetrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('[Metrics] Error exporting metrics:', error)
    return new NextResponse('# Error exporting metrics\n', { 
      status: 500,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4',
      },
    })
  }
}
