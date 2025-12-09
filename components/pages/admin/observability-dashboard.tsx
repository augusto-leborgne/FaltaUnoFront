"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Server, 
  Database, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  HardDrive,
  Zap,
  BarChart3,
  Globe,
  Smartphone
} from "lucide-react"
import { API_URL } from "@/lib/api"
import { AuthService } from "@/lib/auth"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface ObservabilityMetrics {
  performance: {
    avgResponseTime: number
    p50ResponseTime: number
    p95ResponseTime: number
    p99ResponseTime: number
    requestsPerMinute: number
    errorRate: number
    successRate: number
    endpointCalls: Record<string, number>
    slowestEndpoints: Record<string, number>
  }
  costs: {
    monthlyEstimate: number
    dailyCost: number
    cloudRunBackend: number
    cloudRunFrontend: number
    cloudSql: number
    storage: number
    bandwidth: number
    costBreakdown: Record<string, number>
    trends: Array<{ date: string; cost: number }>
  }
  users: {
    activeUsers: number
    dailyActiveUsers: number
    weeklyActiveUsers: number
    onlineUsers: number
    usersByCountry: Record<string, number>
    usersByDevice: Record<string, number>
    activityTrends: Array<{ date: string; users: number }>
  }
  system: {
    version: string
    environment: string
    uptime: number
    cpuUsage: number
    memoryUsage: number
    memoryUsedMB: number
    memoryTotalMB: number
    activeInstances: number
    maxInstances: number
    jvmInfo: Record<string, string>
  }
  database: {
    totalConnections: number
    activeConnections: number
    idleConnections: number
    connectionPoolUsage: number
    cacheHits: number
    cacheMisses: number
    cacheHitRate: number
    totalQueries: number
    avgQueryTime: number
    slowQueries: Array<{ query: string; avgTime: number; calls: number }>
    tablesSizes: Record<string, number>
  }
  alerts: Array<{
    level: string
    category: string
    message: string
    details: string
    timestamp: string
    action: string
  }>
  timestamp: string
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

export function ObservabilityDashboard() {
  const [metrics, setMetrics] = useState<ObservabilityMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchMetrics = async () => {
    try {
      const token = AuthService.getToken()
      if (!token) throw new Error("No hay token de autenticación")

      const response = await fetch(`${API_URL}/admin/observability`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      const json = await response.json()
      setMetrics(json.data !== undefined ? json.data : json)
      setError(null)
    } catch (err) {
      console.error("[Observability] Error fetching metrics:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()

    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 30000) // Refresh cada 30 segundos
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400">Error: {error}</p>
      </div>
    )
  }

  if (!metrics) return null

  // Preparar datos para gráficos
  const costTrendData = metrics.costs.trends.map((t) => ({
    date: new Date(t.date).toLocaleDateString("es-UY", { month: "short", day: "numeric" }),
    costo: t.cost,
  }))

  const userTrendData = metrics.users.activityTrends.map((t) => ({
    date: new Date(t.date).toLocaleDateString("es-UY", { month: "short", day: "numeric" }),
    usuarios: t.users,
  }))

  const costBreakdownData = Object.entries(metrics.costs.costBreakdown).map(([name, value]) => ({
    name,
    value,
  }))

  const usersByCountryData = Object.entries(metrics.users.usersByCountry).map(([name, value]) => ({
    name,
    value,
  }))

  const usersByDeviceData = Object.entries(metrics.users.usersByDevice).map(([name, value]) => ({
    name,
    value,
  }))

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  const getAlertIcon = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case "WARNING":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      default:
        return <CheckCircle className="h-5 w-5 text-green-500" />
    }
  }

  const getAlertColor = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
      case "WARNING":
        return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
      default:
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
    }
  }

  return (
    <div className="space-y-4 xs:space-y-5 sm:space-y-6 p-3 xs:p-4 sm:p-5 md:p-6">
      {/* Header */}
      <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 xs:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold truncate">Observabilidad</h1>
          <p className="text-xs xs:text-sm text-muted-foreground truncate">
            Última actualización: {new Date(metrics.timestamp).toLocaleString("es-UY")}
          </p>
        </div>
        <div className="flex items-center gap-1.5 xs:gap-2 flex-shrink-0">
          <Badge variant={autoRefresh ? "default" : "secondary"} className="text-xs xs:text-sm whitespace-nowrap">
            {autoRefresh ? "Auto: ON" : "Auto: OFF"}
          </Badge>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="px-2 xs:px-3 py-1.5 xs:py-2 text-xs xs:text-sm border rounded-md hover:bg-accent min-h-[36px] xs:min-h-[40px] touch-manipulation"
          >
            {autoRefresh ? "Pausar" : "Activar"}
          </button>
          <button
            onClick={fetchMetrics}
            className="px-2 xs:px-3 py-1.5 xs:py-2 text-xs xs:text-sm border rounded-md hover:bg-accent min-h-[36px] xs:min-h-[40px] touch-manipulation"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Alertas */}
      {metrics.alerts.length > 0 && (
        <div className="space-y-2 xs:space-y-2.5">
          <h2 className="text-lg xs:text-xl font-semibold">Alertas</h2>
          {metrics.alerts.map((alert, idx) => (
            <Card key={idx} className={`p-3 xs:p-4 border ${getAlertColor(alert.level)}`}>
              <div className="flex items-start gap-2 xs:gap-3">
                {getAlertIcon(alert.level)}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 xs:gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">{alert.category}</Badge>
                    <span className="text-xs xs:text-sm font-semibold break-words">{alert.message}</span>
                  </div>
                  <p className="text-xs xs:text-sm text-muted-foreground mb-2 break-words">{alert.details}</p>
                  <p className="text-[10px] xs:text-xs text-muted-foreground break-words">
                    <strong>Acción:</strong> {alert.action}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="performance" className="w-full">
        <div className="overflow-x-auto -mx-3 xs:-mx-4 sm:-mx-5 md:-mx-6 px-3 xs:px-4 sm:px-5 md:px-6">
          <TabsList className="inline-flex sm:grid w-auto sm:w-full sm:grid-cols-5 gap-1">
          <TabsTrigger value="performance" className="whitespace-nowrap text-xs xs:text-sm">
            <Activity className="h-3.5 xs:h-4 w-3.5 xs:w-4 mr-1 xs:mr-2" />
            <span className="hidden xs:inline">Rendimiento</span>
            <span className="xs:hidden">Perf</span>
          </TabsTrigger>
          <TabsTrigger value="costs" className="whitespace-nowrap text-xs xs:text-sm">
            <DollarSign className="h-3.5 xs:h-4 w-3.5 xs:w-4 mr-1 xs:mr-2" />
            Costos
          </TabsTrigger>
          <TabsTrigger value="users" className="whitespace-nowrap text-xs xs:text-sm">
            <Users className="h-3.5 xs:h-4 w-3.5 xs:w-4 mr-1 xs:mr-2" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="system" className="whitespace-nowrap text-xs xs:text-sm">
            <Server className="h-3.5 xs:h-4 w-3.5 xs:w-4 mr-1 xs:mr-2" />
            Sistema
          </TabsTrigger>
          <TabsTrigger value="database" className="whitespace-nowrap text-xs xs:text-sm">
            <Database className="h-3.5 xs:h-4 w-3.5 xs:w-4 mr-1 xs:mr-2" />
            <span className="hidden xs:inline">Base de Datos</span>
            <span className="xs:hidden">BD</span>
          </TabsTrigger>
        </TabsList>
        </div>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-3 xs:space-y-4 mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 xs:gap-3 sm:gap-4">
            <Card className="p-3 xs:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] xs:text-xs sm:text-sm text-muted-foreground truncate">Tiempo Prom.</p>
                  <p className="text-lg xs:text-xl sm:text-2xl font-bold truncate">{metrics.performance.avgResponseTime.toFixed(1)}ms</p>
                </div>
                <Clock className="h-6 xs:h-7 sm:h-8 w-6 xs:w-7 sm:w-8 text-blue-500 flex-shrink-0" />
              </div>
            </Card>

            <Card className="p-3 xs:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] xs:text-xs sm:text-sm text-muted-foreground truncate">P95 Latency</p>
                  <p className="text-lg xs:text-xl sm:text-2xl font-bold truncate">{metrics.performance.p95ResponseTime.toFixed(1)}ms</p>
                </div>
                <Zap className="h-6 xs:h-7 sm:h-8 w-6 xs:w-7 sm:w-8 text-yellow-500 flex-shrink-0" />
              </div>
            </Card>

            <Card className="p-3 xs:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] xs:text-xs sm:text-sm text-muted-foreground truncate">Req/min</p>
                  <p className="text-lg xs:text-xl sm:text-2xl font-bold truncate">{metrics.performance.requestsPerMinute}</p>
                </div>
                <BarChart3 className="h-6 xs:h-7 sm:h-8 w-6 xs:w-7 sm:w-8 text-purple-500 flex-shrink-0" />
              </div>
            </Card>

            <Card className="p-3 xs:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] xs:text-xs sm:text-sm text-muted-foreground truncate">Success Rate</p>
                  <p className="text-lg xs:text-xl sm:text-2xl font-bold truncate">{metrics.performance.successRate.toFixed(1)}%</p>
                </div>
                {metrics.performance.successRate >= 99 ? (
                  <CheckCircle className="h-6 xs:h-7 sm:h-8 w-6 xs:w-7 sm:w-8 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-6 xs:h-7 sm:h-8 w-6 xs:w-7 sm:w-8 text-red-500 flex-shrink-0" />
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 xs:gap-4">
            <Card className="p-3 xs:p-4">
              <h3 className="text-sm xs:text-base sm:text-lg font-semibold mb-3 xs:mb-4">Top Endpoints (Llamadas)</h3>
              <div className="space-y-1.5 xs:space-y-2">
                {Object.entries(metrics.performance.endpointCalls)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([endpoint, calls]) => (
                    <div key={endpoint} className="flex justify-between items-center gap-2">
                      <span className="text-xs xs:text-sm truncate flex-1 min-w-0">{endpoint}</span>
                      <Badge variant="secondary" className="text-xs flex-shrink-0">{calls}</Badge>
                    </div>
                  ))}
              </div>
            </Card>

            <Card className="p-3 xs:p-4">
              <h3 className="text-sm xs:text-base sm:text-lg font-semibold mb-3 xs:mb-4">Endpoints Más Lentos</h3>
              <div className="space-y-1.5 xs:space-y-2">
                {Object.entries(metrics.performance.slowestEndpoints)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([endpoint, time]) => (
                    <div key={endpoint} className="flex justify-between items-center">
                      <span className="text-sm truncate max-w-xs">{endpoint}</span>
                      <Badge variant="destructive">{time.toFixed(1)}ms</Badge>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-3 xs:space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 xs:gap-3 sm:gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Costo Mensual</p>
                  <p className="text-3xl font-bold text-green-600">
                    ${metrics.costs.monthlyEstimate.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics.costs.monthlyEstimate < 40 ? "✓ Dentro del presupuesto" : "⚠ Fuera del presupuesto"}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Costo Diario</p>
                  <p className="text-3xl font-bold">${metrics.costs.dailyCost.toFixed(2)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-blue-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Proyección Anual</p>
                  <p className="text-3xl font-bold">${(metrics.costs.monthlyEstimate * 12).toFixed(0)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Tendencia de Costos (7 días)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={costTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="costo" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Desglose de Costos</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={costBreakdownData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: $${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {costBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Detalle de Servicios</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Backend (Cloud Run)</p>
                <p className="text-xl font-bold">${metrics.costs.cloudRunBackend}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Frontend (Cloud Run)</p>
                <p className="text-xl font-bold">${metrics.costs.cloudRunFrontend}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cloud SQL</p>
                <p className="text-xl font-bold">${metrics.costs.cloudSql}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Storage</p>
                <p className="text-xl font-bold">${metrics.costs.storage}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bandwidth</p>
                <p className="text-xl font-bold">${metrics.costs.bandwidth}</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-3 xs:space-y-4 mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 xs:gap-3 sm:gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Usuarios Activos (30d)</p>
                  <p className="text-2xl font-bold">{metrics.users.activeUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Activos Semanalmente</p>
                  <p className="text-2xl font-bold">{metrics.users.weeklyActiveUsers}</p>
                </div>
                <Users className="h-8 w-8 text-green-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Activos Hoy</p>
                  <p className="text-2xl font-bold">{metrics.users.dailyActiveUsers}</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Online Ahora</p>
                  <p className="text-2xl font-bold">{metrics.users.onlineUsers}</p>
                </div>
                <Activity className="h-8 w-8 text-green-500 animate-pulse" />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-4 lg:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Actividad de Usuarios (7 días)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={userTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="usuarios" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Por País</h3>
              <div className="space-y-2">
                {usersByCountryData.map((item) => (
                  <div key={item.name} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <Badge variant="secondary">{item.value}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Por Dispositivo</h3>
            <div className="grid grid-cols-3 gap-4">
              {usersByDeviceData.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{item.name}</p>
                    <p className="text-xl font-bold">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-3 xs:space-y-4 mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 xs:gap-3 sm:gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">CPU Usage</p>
                  <p className="text-2xl font-bold">{metrics.system.cpuUsage.toFixed(1)}%</p>
                </div>
                <Cpu className="h-8 w-8 text-blue-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Memory Usage</p>
                  <p className="text-2xl font-bold">{metrics.system.memoryUsage.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.system.memoryUsedMB}MB / {metrics.system.memoryTotalMB}MB
                  </p>
                </div>
                <HardDrive className="h-8 w-8 text-purple-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Uptime</p>
                  <p className="text-xl font-bold">{formatUptime(metrics.system.uptime)}</p>
                </div>
                <Server className="h-8 w-8 text-green-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Instancias</p>
                  <p className="text-2xl font-bold">
                    {metrics.system.activeInstances} / {metrics.system.maxInstances}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-orange-500" />
              </div>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Información del Sistema</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Versión</p>
                <p className="font-semibold">{metrics.system.version}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Entorno</p>
                <Badge variant={metrics.system.environment === "production" ? "default" : "secondary"}>
                  {metrics.system.environment}
                </Badge>
              </div>
              {Object.entries(metrics.system.jvmInfo).map(([key, value]) => (
                <div key={key}>
                  <p className="text-sm text-muted-foreground capitalize">{key.replace("_", " ")}</p>
                  <p className="font-semibold text-sm">{value}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-3 xs:space-y-4 mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 xs:gap-3 sm:gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conexiones Activas</p>
                  <p className="text-2xl font-bold">
                    {metrics.database.activeConnections} / {metrics.database.totalConnections}
                  </p>
                </div>
                <Database className="h-8 w-8 text-blue-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pool Usage</p>
                  <p className="text-2xl font-bold">{metrics.database.connectionPoolUsage.toFixed(1)}%</p>
                </div>
                <Activity className="h-8 w-8 text-purple-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cache Hit Rate</p>
                  <p className="text-2xl font-bold">{metrics.database.cacheHitRate.toFixed(1)}%</p>
                </div>
                <Zap className="h-8 w-8 text-green-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Query Time</p>
                  <p className="text-2xl font-bold">{metrics.database.avgQueryTime.toFixed(1)}ms</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Queries Más Lentas</h3>
              <div className="space-y-3">
                {metrics.database.slowQueries.slice(0, 5).map((query, idx) => (
                  <div key={idx} className="border-b pb-2 last:border-0">
                    <div className="flex justify-between items-start mb-1">
                      <code className="text-xs bg-muted px-2 py-1 rounded max-w-md truncate">
                        {query.query}
                      </code>
                      <Badge variant="destructive">{query.avgTime.toFixed(1)}ms</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Llamadas: {query.calls}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Tamaño de Tablas (MB)</h3>
              <div className="space-y-2">
                {Object.entries(metrics.database.tablesSizes)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 8)
                  .map(([table, size]) => (
                    <div key={table} className="flex justify-between items-center">
                      <span className="text-sm font-mono">{table}</span>
                      <Badge variant="secondary">{size} MB</Badge>
                    </div>
                  ))}
              </div>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Estadísticas de Cache</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Cache Hits</p>
                <p className="text-2xl font-bold text-green-600">{metrics.database.cacheHits.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cache Misses</p>
                <p className="text-2xl font-bold text-red-600">{metrics.database.cacheMisses.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Queries</p>
                <p className="text-2xl font-bold">{metrics.database.totalQueries.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
