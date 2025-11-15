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

// POST endpoint para recibir y reenviar métricas a Grafana Cloud
export async function POST(request: NextRequest) {
  try {
    const metricsData = await request.text()
    
    // Verificar que hay datos para enviar
    if (!metricsData || metricsData.trim().length === 0) {
      return new NextResponse('No metrics data', { status: 400 })
    }

    // Configuración de Grafana Cloud
    const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_PROMETHEUS_URL
    const grafanaUser = process.env.NEXT_PUBLIC_GRAFANA_USER
    const grafanaApiKey = process.env.NEXT_PUBLIC_GRAFANA_API_KEY
    const grafanaEnabled = process.env.NEXT_PUBLIC_GRAFANA_ENABLED === 'true'

    if (!grafanaEnabled) {
      return new NextResponse('Grafana disabled', { status: 200 })
    }

    if (!grafanaUrl || !grafanaUser || !grafanaApiKey) {
      console.error('Grafana Cloud credentials not configured')
      return new NextResponse('Grafana not configured', { status: 500 })
    }

    // Enviar a Grafana Cloud usando Prometheus Remote Write
    const auth = Buffer.from(`${grafanaUser}:${grafanaApiKey}`).toString('base64')
    
    const response = await fetch(grafanaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`,
        'User-Agent': 'FaltaUno-Frontend/1.0',
      },
      body: metricsData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Grafana Cloud error (${response.status}):`, errorText)
      return new NextResponse(`Grafana error: ${response.status}`, { status: response.status })
    }

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Error pushing metrics to Grafana:', error)
    return new NextResponse('Error pushing metrics', { status: 500 })
  }
}
