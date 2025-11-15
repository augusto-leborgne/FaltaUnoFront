# Observabilidad Grafana Cloud - Guía Rápida

## ✅ Configuración Actual

La observabilidad ya está configurada y habilitada:

```env
NEXT_PUBLIC_GRAFANA_ENABLED=true
NEXT_PUBLIC_GRAFANA_PROMETHEUS_URL=https://prometheus-prod-13-prod-us-east-0.grafana.net/api/prom/push
NEXT_PUBLIC_GRAFANA_USER=1439066
NEXT_PUBLIC_GRAFANA_API_KEY=glc_eyJv...
```

## 🚀 Cómo Funciona

### 1. Frontend (Next.js)
- **Métricas colectadas automáticamente:**
  - Page views por ruta
  - API calls (endpoint, método, status, duración)
  - Errores de JavaScript
  - Web Vitals (LCP, FID, CLS)
  - WebSocket connections
  - User actions (login, register, partido created, etc.)

- **Frecuencia de envío:** Cada 30 segundos
- **Endpoint:** `POST /api/metrics` → Grafana Cloud

### 2. Backend (Spring Boot)
- Micrometer expone métricas en `/actuator/prometheus`
- Grafana Cloud debe configurarse para hacer scraping

## 📊 Verificar que Funciona

### Paso 1: Verificar métricas localmente
```bash
# Frontend - Ver métricas generadas
curl http://localhost:3000/api/metrics

# Deberías ver:
# HELP faltauno_page_views_total Counter for page views
# TYPE faltauno_page_views_total counter
# faltauno_page_views_total{path="/home"} 5
```

### Paso 2: Verificar envío a Grafana
1. Abre DevTools → Network
2. Navega por la app
3. Busca requests a `/api/metrics` (POST)
4. Verifica que retornan `200 OK`

### Paso 3: Ver métricas en Grafana Cloud

1. **Accede a Grafana Cloud:**
   ```
   https://augustoleborgne.grafana.net/
   ```

2. **Ir a Explore:**
   - Menú lateral → "Explore"
   - Data source: "grafanacloud-augustoleborgne-prom"

3. **Queries de ejemplo:**

   **Page Views:**
   ```promql
   rate(faltauno_page_views_total[5m])
   ```

   **API Call Rate:**
   ```promql
   rate(faltauno_api_calls_total[5m])
   ```

   **API Duration (p95):**
   ```promql
   histogram_quantile(0.95, rate(faltauno_api_duration_ms_bucket[5m]))
   ```

   **Error Rate:**
   ```promql
   rate(faltauno_errors_total[5m])
   ```

   **WebSocket Connections:**
   ```promql
   faltauno_websocket_connected
   ```

## 📈 Crear Dashboard

### Dashboard Básico

1. **Ir a Dashboards → New Dashboard**

2. **Panel 1: Page Views**
   - Query: `rate(faltauno_page_views_total[5m])`
   - Visualization: Time series
   - Legend: `{{path}}`

3. **Panel 2: API Performance**
   - Query A: `histogram_quantile(0.50, rate(faltauno_api_duration_ms_bucket[5m]))`
   - Query B: `histogram_quantile(0.95, rate(faltauno_api_duration_ms_bucket[5m]))`
   - Query C: `histogram_quantile(0.99, rate(faltauno_api_duration_ms_bucket[5m]))`
   - Legend: p50, p95, p99

4. **Panel 3: Error Rate**
   - Query: `rate(faltauno_errors_total[5m])`
   - Visualization: Graph
   - Alert threshold: > 1

5. **Panel 4: API Calls by Status**
   - Query: `sum(rate(faltauno_api_calls_total[5m])) by (status)`
   - Visualization: Pie chart

6. **Panel 5: Top Pages**
   - Query: `topk(10, sum(rate(faltauno_page_views_total[1h])) by (path))`
   - Visualization: Bar gauge

## 🔧 Troubleshooting

### No veo métricas en Grafana

**1. Verificar que las métricas se generan:**
```bash
curl http://localhost:3000/api/metrics
```
Si no ves métricas, navega por la app primero.

**2. Verificar envío:**
Revisa la consola del navegador (solo en dev):
```
Failed to push metrics: <error>
```

**3. Verificar credenciales:**
En `.env.local`:
- `NEXT_PUBLIC_GRAFANA_ENABLED=true`
- URL, USER, API_KEY correctos

**4. Verificar formato:**
Grafana espera formato Prometheus:
```
metric_name{label="value"} value timestamp
```

### Métricas llegan pero no se visualizan

**1. Esperar 1-2 minutos:** 
Las métricas tardan en procesarse.

**2. Verificar nombres:**
En Explore, busca: `faltauno_*`

**3. Verificar timestamps:**
Las métricas incluyen timestamps en milisegundos.

## 📝 Métricas Disponibles

### Frontend Metrics

| Métrica | Tipo | Labels | Descripción |
|---------|------|--------|-------------|
| `faltauno_page_views_total` | Counter | `path` | Page views por ruta |
| `faltauno_api_calls_total` | Counter | `endpoint, method, status` | API calls |
| `faltauno_api_duration_ms` | Histogram | `endpoint, method` | Duración de API calls |
| `faltauno_errors_total` | Counter | `type, component` | Errores de JS |
| `faltauno_page_load_ms` | Histogram | - | Tiempo de carga de página |
| `faltauno_user_logins_total` | Counter | - | Logins exitosos |
| `faltauno_user_registrations_total` | Counter | - | Registros de usuarios |
| `faltauno_partidos_created_total` | Counter | `tipo` | Partidos creados |
| `faltauno_partidos_joined_total` | Counter | - | Inscripciones a partidos |
| `faltauno_partidos_cancelled_total` | Counter | - | Partidos cancelados |
| `faltauno_websocket_connected` | Gauge | - | Estado de WebSocket |
| `faltauno_websocket_messages_total` | Counter | `type` | Mensajes WebSocket |

## 🎯 Próximos Pasos

1. **Crear Alertas:**
   - Error rate > 1/s durante 5 min
   - API p95 latency > 2s durante 10 min
   - WebSocket desconectado

2. **Dashboard de Producción:**
   - Overview con todas las métricas clave
   - Paneles por feature (Auth, Partidos, Chat)
   - Variables para filtrar por ruta/endpoint

3. **Logs Integration:**
   - Configurar Cloud Logging → Loki
   - Correlacionar logs con métricas

4. **Backend Metrics:**
   - Configurar Grafana Agent para scrape de `/actuator/prometheus`
   - O configurar push gateway

## 🔗 Enlaces Útiles

- **Grafana Cloud:** https://augustoleborgne.grafana.net/
- **Prometheus Docs:** https://prometheus.io/docs/
- **PromQL Tutorial:** https://prometheus.io/docs/prometheus/latest/querying/basics/
