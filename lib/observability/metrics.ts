/**
 * Metrics collector para Prometheus
 * Exporta métricas en formato Prometheus para Grafana
 */

const isProduction = process.env.NODE_ENV === 'production'

interface Metric {
  name: string
  type: 'counter' | 'gauge' | 'histogram'
  help: string
  labels?: Record<string, string>
  value: number
  timestamp?: number
}

class MetricsCollector {
  private metrics: Map<string, Metric> = new Map()
  private histograms: Map<string, number[]> = new Map()

  /**
   * Incrementar un contador
   */
  incrementCounter(name: string, labels?: Record<string, string>, value: number = 1): void {
    const key = this.getMetricKey(name, labels)
    const existing = this.metrics.get(key)

    if (existing) {
      existing.value += value
      existing.timestamp = Date.now()
    } else {
      this.metrics.set(key, {
        name,
        type: 'counter',
        help: `Counter for ${name}`,
        labels,
        value,
        timestamp: Date.now(),
      })
    }

    // En desarrollo, log
    if (!isProduction) {
      console.log(`📊 Counter [${name}] +${value}`, labels)
    }
  }

  /**
   * Establecer un gauge (valor que puede subir y bajar)
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels)
    
    this.metrics.set(key, {
      name,
      type: 'gauge',
      help: `Gauge for ${name}`,
      labels,
      value,
      timestamp: Date.now(),
    })

    if (!isProduction) {
      console.log(`📊 Gauge [${name}] = ${value}`, labels)
    }
  }

  /**
   * Registrar valor de histograma (para percentiles)
   */
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels)
    
    if (!this.histograms.has(key)) {
      this.histograms.set(key, [])
    }
    
    this.histograms.get(key)!.push(value)

    // Calcular estadísticas
    const values = this.histograms.get(key)!
    const sorted = [...values].sort((a, b) => a - b)
    const p50 = sorted[Math.floor(sorted.length * 0.5)]
    const p95 = sorted[Math.floor(sorted.length * 0.95)]
    const p99 = sorted[Math.floor(sorted.length * 0.99)]

    this.metrics.set(key, {
      name,
      type: 'histogram',
      help: `Histogram for ${name}`,
      labels: { ...labels, quantile: '0.5' },
      value: p50,
      timestamp: Date.now(),
    })

    if (!isProduction) {
      console.log(`📊 Histogram [${name}] p50=${p50}ms p95=${p95}ms p99=${p99}ms`, labels)
    }
  }

  /**
   * Medir tiempo de ejecución de una función
   */
  async measureTime<T>(
    name: string,
    fn: () => Promise<T>,
    labels?: Record<string, string>
  ): Promise<T> {
    const start = performance.now()
    
    try {
      const result = await fn()
      const duration = performance.now() - start
      
      this.observeHistogram(`${name}_duration_ms`, duration, {
        ...labels,
        status: 'success',
      })
      
      return result
    } catch (error) {
      const duration = performance.now() - start
      
      this.observeHistogram(`${name}_duration_ms`, duration, {
        ...labels,
        status: 'error',
      })
      
      throw error
    }
  }

  /**
   * Obtener todas las métricas en formato Prometheus
   */
  exportPrometheus(): string {
    const lines: string[] = []

    // Group by metric name
    const grouped = new Map<string, Metric[]>()
    
    for (const metric of this.metrics.values()) {
      if (!grouped.has(metric.name)) {
        grouped.set(metric.name, [])
      }
      grouped.get(metric.name)!.push(metric)
    }

    // Export in Prometheus format
    for (const [name, metrics] of grouped) {
      const firstMetric = metrics[0]
      
      // HELP line
      lines.push(`# HELP ${name} ${firstMetric.help}`)
      // TYPE line
      lines.push(`# TYPE ${name} ${firstMetric.type}`)
      
      // Metric lines
      for (const metric of metrics) {
        const labelsStr = metric.labels 
          ? Object.entries(metric.labels)
              .map(([k, v]) => `${k}="${v}"`)
              .join(',')
          : ''
        
        const metricLine = labelsStr 
          ? `${name}{${labelsStr}} ${metric.value}`
          : `${name} ${metric.value}`
        
        lines.push(metricLine)
      }
      
      lines.push('') // Empty line between metrics
    }

    return lines.join('\n')
  }

  /**
   * Enviar métricas al backend para que Prometheus las scrape
   */
  async pushMetrics(): Promise<void> {
    if (!isProduction) return

    try {
      const metricsData = this.exportPrometheus()
      
      // Send to backend endpoint that Prometheus will scrape
      await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: metricsData,
      })
    } catch (error) {
      // Silently fail - metrics shouldn't break the app
      console.error('Failed to push metrics:', error)
    }
  }

  /**
   * Limpiar métricas antiguas (evitar memory leak)
   */
  cleanup(maxAge: number = 5 * 60 * 1000): void {
    const now = Date.now()
    
    for (const [key, metric] of this.metrics) {
      if (metric.timestamp && (now - metric.timestamp) > maxAge) {
        this.metrics.delete(key)
      }
    }
  }

  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name
    
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',')
    
    return `${name}{${labelStr}}`
  }
}

// Singleton instance
export const metrics = new MetricsCollector()

// Auto-cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => metrics.cleanup(), 5 * 60 * 1000)
}

// Auto-push metrics every minute in production
if (isProduction && typeof window !== 'undefined') {
  setInterval(() => metrics.pushMetrics(), 60 * 1000)
}

// Métricas predefinidas para la app

export const AppMetrics = {
  // Page views
  pageView: (path: string) => {
    metrics.incrementCounter('faltauno_page_views_total', { path })
  },

  // User actions
  userLogin: () => {
    metrics.incrementCounter('faltauno_user_logins_total')
  },

  userRegister: () => {
    metrics.incrementCounter('faltauno_user_registrations_total')
  },

  // Partidos
  partidoCreated: (tipo: string) => {
    metrics.incrementCounter('faltauno_partidos_created_total', { tipo })
  },

  partidoJoined: () => {
    metrics.incrementCounter('faltauno_partidos_joined_total')
  },

  partidoCancelled: () => {
    metrics.incrementCounter('faltauno_partidos_cancelled_total')
  },

  // API calls
  apiCall: (endpoint: string, method: string, status: number, duration: number) => {
    metrics.incrementCounter('faltauno_api_calls_total', { 
      endpoint, 
      method, 
      status: status.toString() 
    })
    metrics.observeHistogram('faltauno_api_duration_ms', duration, { 
      endpoint, 
      method 
    })
  },

  // Errors
  error: (type: string, component?: string) => {
    metrics.incrementCounter('faltauno_errors_total', { type, component: component || 'unknown' })
  },

  // Performance
  pageLoadTime: (duration: number) => {
    metrics.observeHistogram('faltauno_page_load_ms', duration)
  },

  // WebSocket
  websocketConnected: () => {
    metrics.setGauge('faltauno_websocket_connected', 1)
  },

  websocketDisconnected: () => {
    metrics.setGauge('faltauno_websocket_connected', 0)
  },

  websocketMessage: (type: string) => {
    metrics.incrementCounter('faltauno_websocket_messages_total', { type })
  },

  // Direct counter increment (for custom metrics)
  incrementCounter: (name: string, labels?: Record<string, string>) => {
    metrics.incrementCounter(name, labels)
  },
}

export default metrics
