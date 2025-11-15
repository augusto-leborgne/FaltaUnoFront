/**
 * Logger con soporte para Cloud Logging y métricas
 * - Desarrollo: Console logging con colores
 * - Producción: Logs estructurados JSON a Google Cloud Logging
 */

import { cloudLogger } from './observability/cloud-logger'

// Re-export cloud logger como logger principal
export const logger = cloudLogger

// Backward compatibility
export default logger
