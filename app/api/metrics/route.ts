/**
 * API endpoint para métricas Prometheus
 * POST /api/metrics - Recibe métricas del frontend y pushea a Grafana Cloud
 */

import { NextRequest, NextResponse } from 'next/server'

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
      console.error('[Metrics] Grafana credentials not configured')
      return new NextResponse('OK', { status: 200 })
    }
    
    console.log('[Metrics] Pushing', metricsText.split('\n').length, 'lines to Grafana Cloud')
    
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
      console.error('[Metrics] Grafana Remote Write failed:', response.status, errorText)
      return new NextResponse(`Grafana error: ${response.status}`, { status: 500 })
    }
    
    console.log('[Metrics] Successfully pushed to Grafana Cloud')
    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('[Metrics] Error pushing to Grafana:', error)
    return new NextResponse('Internal error', { status: 500 })
  }
}
