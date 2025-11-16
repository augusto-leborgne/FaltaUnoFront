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

// POST endpoint para recibir métricas del frontend y pushear a Grafana Cloud
export async function POST(request: NextRequest) {
  try {
    const metricsText = await request.text()
    
    if (!metricsText || metricsText.trim().length === 0) {
      return new NextResponse('No metrics data', { status: 400 })
    }

    // Push to Grafana Cloud Remote Write
    const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_PROMETHEUS_URL
    const grafanaUser = process.env.NEXT_PUBLIC_GRAFANA_USER
    const grafanaKey = process.env.NEXT_PUBLIC_GRAFANA_API_KEY
    
    if (!grafanaUrl || !grafanaUser || !grafanaKey) {
      console.error('Grafana credentials not configured')
      return new NextResponse('OK', { status: 200 }) // No fallar si no está configurado
    }
    
    const response = await fetch(grafanaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Authorization': 'Basic ' + Buffer.from(`${grafanaUser}:${grafanaKey}`).toString('base64'),
      },
      body: metricsText,
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Grafana Remote Write failed:', response.status, errorText)
    }
    
    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Error pushing to Grafana:', error)
    return new NextResponse('OK', { status: 200 })
  }
}
