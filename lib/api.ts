import { AuthService } from "./auth";
import { keysToCamelCase, keysToSnakeCase, dualCaseKeys } from "./case-converter";
import { logger } from "./logger";
import { fetchWithTimeout, fetchWithRetry } from "./fetch-with-timeout";

// ============================================
// CONFIGURACIÓN CENTRALIZADA
// ============================================

/**
 * URL base del backend (sin /api al final)
 * Usa NEXT_PUBLIC_API_URL del .env o fallback a producción
 */
const getApiBase = (): string => {
  // ✅ Backend en Cloud Run con HTTPS - Comunicación directa sin proxy
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://faltauno-backend-169771742214.us-central1.run.app';
  
  logger.debug('[API Config] Using Cloud Run backend URL:', backendUrl);
  logger.debug('[API Config] Environment:', typeof window === 'undefined' ? 'SERVER (SSR)' : 'BROWSER');
  
  return backendUrl;
};

/**
 * URL base del backend (sin /api)
 * Usar para endpoints OAuth y endpoints raíz
 */
export const API_BASE = getApiBase();

/**
 * URL para endpoints de API (/api/*)
 * Usar para la mayoría de llamadas REST
 */
export const API_URL = `${API_BASE}/api`;

/**
 * Normalizar URLs (eliminar barras duplicadas)
 */
export const normalizeUrl = (url: string) => url.replace(/([^:]\/)\/+/g, '$1');

/**
 * Obtener URL de foto de usuario
 */
export const getUserPhotoUrl = (userId: string) => `${API_BASE}/api/usuarios/${userId}/foto`;

logger.debug('[API Config] Final API_BASE:', API_BASE);
logger.debug('[API Config] Final API_URL:', API_URL);
logger.debug('[API Config] Environment:', typeof window === 'undefined' ? 'SERVER (SSR)' : 'BROWSER');

// ============================================
// TIPOS BASE
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// RETRY CONFIGURATION
// ============================================

const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['Failed to fetch', 'NetworkError', 'ERR_CONNECTION_CLOSED', 'ERR_CONNECTION_RESET']
}

/**
 * Sleep utility for delays between retries
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Check if an error is retryable
 */
const isRetryableError = (error: any, statusCode?: number): boolean => {
  // Check status codes
  if (statusCode && RETRY_CONFIG.retryableStatusCodes.includes(statusCode)) {
    return true
  }
  
  // Check error messages
  if (error instanceof Error) {
    return RETRY_CONFIG.retryableErrors.some(msg => 
      error.message.includes(msg) || error.toString().includes(msg)
    )
  }
  
  return false
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
const getRetryDelay = (attemptNumber: number): number => {
  const baseDelay = RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attemptNumber)
  const delay = Math.min(baseDelay, RETRY_CONFIG.maxDelayMs)
  // Add jitter (±25%)
  const jitter = delay * 0.25 * (Math.random() - 0.5)
  return Math.round(delay + jitter)
}

// ============================================
// INTERFACES DE USUARIO
// ============================================

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  celular?: string;
  fechaNacimiento?: string; // yyyy-MM-dd
  altura?: number;
  peso?: number;
  posicion?: string;
  nivel?: string;
  foto_perfil?: string; // Base64 string
  ubicacion?: string;
  cedula?: string;
  perfilCompleto?: boolean;
  cedulaVerificada?: boolean;
  emailVerified?: boolean; // ✅ Nuevo campo
  provider?: string;
  created_at?: string;
}

export interface UsuarioMinDTO {
  id: string;
  nombre: string;
  apellido: string;
  foto_perfil?: string;
  posicion?: string;
  rating?: number;
}

// ============================================
// INTERFACES DE PARTIDOS
// ============================================

export interface PartidoDTO {
  // Campos principales (el backend devuelve snake_case en algunos casos)
  id?: string;
  tipo_partido?: string; // Backend usa snake_case
  tipoPartido?: string;  // Frontend usa camelCase - mantener ambos
  genero: string;
  nivel?: string;
  fecha: string;
  hora: string;
  duracion_minutos?: number; // Backend
  duracionMinutos?: number;  // Frontend
  nombre_ubicacion?: string; // Backend
  nombreUbicacion?: string;  // Frontend
  direccion_ubicacion?: string; // Backend
  direccionUbicacion?: string;  // Frontend
  latitud?: number;
  longitud?: number;
  cantidad_jugadores?: number; // Backend
  cantidadJugadores?: number;  // Frontend
  jugadores_actuales?: number; // Backend
  jugadoresActuales?: number;  // Frontend
  precio_total?: number; // Backend
  precioTotal?: number;  // Frontend
  precio_por_jugador?: number; // Backend
  precioPorJugador?: number;   // Frontend
  descripcion?: string;
  estado: string;
  organizador_id?: string; // Backend
  organizadorId?: string;  // Frontend
  created_at?: string; // Backend
  createdAt?: string;  // Frontend
  
  // Relaciones
  organizador?: UsuarioMinDTO;
  jugadores?: UsuarioMinDTO[];
  solicitudes_pendientes?: InscripcionDTO[]; // Backend
  solicitudesPendientes?: InscripcionDTO[];  // Frontend
}

export enum PartidoEstado {
  DISPONIBLE = "DISPONIBLE",
  CONFIRMADO = "CONFIRMADO",
  CANCELADO = "CANCELADO",
  COMPLETADO = "COMPLETADO"
}

export enum TipoPartido {
  FUTBOL_5 = "FUTBOL_5",
  FUTBOL_7 = "FUTBOL_7",
  FUTBOL_8 = "FUTBOL_8",
  FUTBOL_9 = "FUTBOL_9",
  FUTBOL_11 = "FUTBOL_11"
}

export enum NivelPartido {
  PRINCIPIANTE = "PRINCIPIANTE",
  INTERMEDIO = "INTERMEDIO",
  AVANZADO = "AVANZADO",
  PROFESIONAL = "PROFESIONAL"
}

// ============================================
// INTERFACES DE INSCRIPCIONES
// ============================================

export interface InscripcionDTO {
  id: string;
  partidoId: string;
  usuarioId: string;
  estado: InscripcionEstado;
  createdAt: string;
  usuario?: UsuarioMinDTO;
}

export enum InscripcionEstado {
  PENDIENTE = "PENDIENTE",
  ACEPTADO = "ACEPTADO",
  RECHAZADO = "RECHAZADO"
}

// ============================================
// INTERFACES DE MENSAJES
// ============================================

export interface MensajeDTO {
  id: string;
  contenido: string;
  usuarioId: string;
  partidoId: string;
  createdAt: string;
  usuario?: UsuarioMinDTO;
}

// ============================================
// INTERFACES DE REVIEWS
// ============================================

export interface ReviewDTO {
  id?: string;
  partidoId: string;
  usuarioQueCalificaId: string;
  usuarioCalificadoId: string;
  nivel: number; // 1-5
  deportividad: number; // 1-5
  companerismo: number; // 1-5
  comentario?: string;
  createdAt?: string;
}

// ============================================
// INTERFACES DE NOTIFICACIONES
// ============================================

export enum TipoNotificacion {
  INVITACION_PARTIDO = "INVITACION_PARTIDO",
  SOLICITUD_AMISTAD = "SOLICITUD_AMISTAD",
  AMISTAD_ACEPTADA = "AMISTAD_ACEPTADA",
  INSCRIPCION_ACEPTADA = "INSCRIPCION_ACEPTADA",
  INSCRIPCION_RECHAZADA = "INSCRIPCION_RECHAZADA",
  PARTIDO_CANCELADO = "PARTIDO_CANCELADO",
  PARTIDO_COMPLETADO = "PARTIDO_COMPLETADO",
  JUGADOR_ELIMINADO = "JUGADOR_ELIMINADO",
  NUEVO_MENSAJE = "NUEVO_MENSAJE",
  REVISION_PENDIENTE = "REVISION_PENDIENTE",
  PARTIDO_PROXIMO = "PARTIDO_PROXIMO",
  CAMBIO_PARTIDO = "CAMBIO_PARTIDO",
  GENERAL = "GENERAL"
}

export enum PrioridadNotificacion {
  BAJA = "BAJA",
  NORMAL = "NORMAL",
  ALTA = "ALTA",
  URGENTE = "URGENTE"
}

export interface NotificacionDTO {
  id: string;
  usuario_id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje?: string;
  entidad_id?: string;
  entidad_tipo?: string;
  url_accion?: string;
  leida: boolean;
  fecha_lectura?: string;
  prioridad: PrioridadNotificacion;
  created_at: string;
}

// ============================================
// FUNCIÓN CENTRAL DE API FETCH
// ============================================

interface ApiFetchOptions extends RequestInit {
  skipAuth?: boolean;
  customToken?: string;
  skipAutoLogout?: boolean; // New option to prevent automatic logout on 401
  signal?: AbortSignal; // Support for request cancellation
}

async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<ApiResponse<T>> {
  const { skipAuth = false, customToken, skipAutoLogout = false, signal, ...fetchOptions } = options;

  // Retry wrapper function
  const attemptFetch = async (attemptNumber: number = 0): Promise<ApiResponse<T>> => {
    // ⚡ PROTECCIÓN: Validar y limpiar tokens corruptos/expirados
    if (!skipAuth) {
      AuthService.validateAndCleanup();
    }

    // Obtener token (no esperamos aquí para no añadir latencia a todas las peticiones)
    const token = customToken || (!skipAuth ? AuthService.getToken() : null);
    const hadToken = !!token // si al momento de construir la petición había token
    
    // ⚡ VALIDACIÓN CRÍTICA: Verificar que el token no esté corrupto antes de usarlo
    if (token && !skipAuth) {
      if (AuthService.isTokenExpired(token)) {
        logger.warn('[API] Token expirado detectado antes de hacer request - limpiando');
        AuthService.removeToken();
        AuthService.removeUser();
        throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
      }
    }
    
    // Construir URL completa
    const fullUrl = normalizeUrl(`${API_BASE}${endpoint}`);

    // Preparar headers
    const headers = new Headers(fetchOptions.headers);
    
    // Content-Type solo si no es FormData
    if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    
    // Authorization header
    if (token && !skipAuth) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    // Add connection management headers to prevent drops
    if (!headers.has('Connection')) {
      headers.set('Connection', 'keep-alive');
    }
    if (!headers.has('Keep-Alive')) {
      headers.set('Keep-Alive', 'timeout=30');
    }

    const logPrefix = attemptNumber > 0 ? `[API Retry ${attemptNumber}/${RETRY_CONFIG.maxRetries}]` : '[API]'
    logger.log(`${logPrefix} ${fetchOptions.method || 'GET'} ${endpoint}`);

    try {
      // ⚡ NUEVO: Usar fetchWithTimeout para prevenir requests colgados
      const response = await fetchWithTimeout(fullUrl, {
        ...fetchOptions,
        headers,
        signal, // Add abort signal support
      }, 30000); // 30 segundos timeout

      // Manejo de 401 - Sesión expirada
      if (response.status === 401) {
        // CRÍTICO: Solo hacer logout si tenemos certeza de que el token es inválido
        // NO hacer logout por errores de red o timing
        if (hadToken && !skipAutoLogout) {
          // Verificar si el token realmente está expirado antes de hacer logout
          if (token && AuthService.isTokenExpired(token)) {
            logger.warn('[API] 401 Unauthorized - Token expirado');
            logger.warn('[API] 🚪 LOGOUT INMEDIATO - Redirigiendo a login...');
            AuthService.logout(); // window.location.replace("/login") inmediato
            throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
          } else {
            // Token válido pero backend dice 401 - podría ser error transitorio
            logger.warn('[API] 401 pero token aún válido - NO haciendo logout automático');
            throw new Error('Error de autenticación. Por favor intenta nuevamente.');
          }
        } else {
          logger.warn('[API] 401 recibido - no se hace logout automático');
          throw new Error('No autorizado. Es posible que no tengas permisos para esta acción.');
        }
      }

      // Manejo de 403 - Sin permisos
      if (response.status === 403) {
        throw new Error('No tienes permisos para realizar esta acción');
      }

      // Check if status code is retryable
      if (!response.ok && isRetryableError(null, response.status)) {
        const errorMessage = `Server error ${response.status}: ${response.statusText}`
        logger.warn(`${logPrefix} Retryable error:`, errorMessage)
        
        // Retry if we haven't exceeded max attempts
        if (attemptNumber < RETRY_CONFIG.maxRetries) {
          const delay = getRetryDelay(attemptNumber)
          logger.log(`${logPrefix} Retrying in ${delay}ms...`)
          await sleep(delay)
          return attemptFetch(attemptNumber + 1)
        }
        
        throw new Error(errorMessage)
      }

      // Obtener texto de respuesta
      const responseText = await response.text();
      
      // Intentar parsear JSON
      let responseData: any;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        logger.error('[API] Error parseando respuesta:', responseText);
        throw new Error('Respuesta inválida del servidor');
      }

      // Si la respuesta no es OK
      if (!response.ok) {
        const errorMessage = responseData.message 
          || responseData.error 
          || `Error ${response.status}: ${response.statusText}`;
        
        logger.error(`[API] Error ${response.status}:`, errorMessage);
        
        throw new Error(errorMessage);
      }

      // Normalizar respuesta
      const normalizedResponse: ApiResponse<T> = {
        success: responseData.success ?? true,
        data: responseData.data ?? responseData,
        message: responseData.message,
        error: responseData.error
      };

      if (attemptNumber > 0) {
        logger.log(`${logPrefix} ✓ ${endpoint} completado después de ${attemptNumber} reintentos`);
      } else {
        logger.log(`[API] ✓ ${endpoint} completado`);
      }
      
      return normalizedResponse;

    } catch (error) {
      logger.error(`${logPrefix} Error en ${endpoint}:`, error);
      
      // Handle abort errors (timeouts) - don't retry user-initiated aborts
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('La solicitud tardó demasiado tiempo. Por favor intenta nuevamente.');
      }
      
      // Handle network errors with retry
      if (isRetryableError(error)) {
        if (attemptNumber < RETRY_CONFIG.maxRetries) {
          const delay = getRetryDelay(attemptNumber)
          logger.log(`${logPrefix} Network error, retrying in ${delay}ms...`)
          await sleep(delay)
          return attemptFetch(attemptNumber + 1)
        } else {
          logger.error(`${logPrefix} Max retries (${RETRY_CONFIG.maxRetries}) exceeded for ${endpoint}`)
          throw new Error('Error de conexión persistente. Verifica tu conexión a internet o intenta más tarde.');
        }
      }
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Error de red. Verifica tu conexión.');
    }
  }

  // Start the fetch with retry logic
  return attemptFetch(0);
}

// ============================================
// HELPERS DE NORMALIZACIÓN
// ============================================

/**
 * Normaliza datos del backend al formato esperado por el frontend
 */
function normalizePartido(raw: any): PartidoDTO {
  if (!raw) {
    throw new Error('Datos de partido inválidos');
  }

  // Validar campos críticos
  if (!raw.id) {
    throw new Error('Partido sin ID');
  }
  if (!raw.fecha) {
    throw new Error('Partido sin fecha');
  }
  if (!raw.hora) {
    throw new Error('Partido sin hora');
  }

  // Calcular precio por jugador si no viene
  const precioTotal = raw.precioTotal ?? raw.precio_total ?? 0;
  const cantidadJugadores = raw.cantidadJugadores ?? raw.cantidad_jugadores ?? 1;
  const precioPorJugador = raw.precioPorJugador 
    ?? raw.precio_por_jugador 
    ?? (cantidadJugadores > 0 ? precioTotal / cantidadJugadores : 0);

  // Normalizar organizador
  const organizador = raw.organizador ? {
    id: raw.organizador.id,
    nombre: raw.organizador.nombre,
    apellido: raw.organizador.apellido,
    foto_perfil: raw.organizador.fotoPerfil ?? raw.organizador.foto_perfil,
    posicion: raw.organizador.posicion,
    rating: raw.organizador.rating
  } : undefined;

  // Normalizar jugadores
  const jugadores = (raw.jugadores ?? []).map((j: any) => ({
    id: j.id,
    nombre: j.nombre,
    apellido: j.apellido,
    foto_perfil: j.fotoPerfil ?? j.foto_perfil,
    posicion: j.posicion,
    rating: j.rating
  }));

  return {
    id: raw.id,
    tipo_partido: raw.tipo_partido ?? raw.tipoPartido ?? 'FUTBOL_5',
    tipoPartido: raw.tipoPartido ?? raw.tipo_partido ?? 'FUTBOL_5',
    genero: raw.genero ?? 'Mixto',
    nivel: raw.nivel ?? 'INTERMEDIO',
    fecha: raw.fecha,
    hora: raw.hora,
    duracion_minutos: raw.duracion_minutos ?? raw.duracionMinutos ?? 90,
    duracionMinutos: raw.duracionMinutos ?? raw.duracion_minutos ?? 90,
    nombre_ubicacion: raw.nombre_ubicacion ?? raw.nombreUbicacion ?? '',
    nombreUbicacion: raw.nombreUbicacion ?? raw.nombre_ubicacion ?? '',
    direccion_ubicacion: raw.direccion_ubicacion ?? raw.direccionUbicacion,
    direccionUbicacion: raw.direccionUbicacion ?? raw.direccion_ubicacion,
    latitud: raw.latitud ?? null,
    longitud: raw.longitud ?? null,
    cantidad_jugadores: cantidadJugadores,
    cantidadJugadores: cantidadJugadores,
    jugadores_actuales: raw.jugadores_actuales ?? raw.jugadoresActuales ?? 0,
    jugadoresActuales: raw.jugadoresActuales ?? raw.jugadores_actuales ?? 0,
    precio_total: precioTotal,
    precioTotal: precioTotal,
    precio_por_jugador: Math.round(precioPorJugador * 100) / 100,
    precioPorJugador: Math.round(precioPorJugador * 100) / 100,
    descripcion: raw.descripcion,
    estado: raw.estado ?? 'DISPONIBLE',
    organizador_id: raw.organizador_id ?? raw.organizadorId,
    organizadorId: raw.organizadorId ?? raw.organizador_id,
    created_at: raw.created_at ?? raw.createdAt,
    createdAt: raw.createdAt ?? raw.created_at,
    organizador: organizador,
    jugadores: jugadores,
    solicitudes_pendientes: raw.solicitudes_pendientes ?? raw.solicitudesPendientes ?? [],
    solicitudesPendientes: raw.solicitudesPendientes ?? raw.solicitudes_pendientes ?? []
  };
}

function normalizeInscripcion(raw: any): InscripcionDTO {
  return {
    id: raw.id,
    partidoId: raw.partidoId ?? raw.partido_id,
    usuarioId: raw.usuarioId ?? raw.usuario_id,
    estado: raw.estado ?? InscripcionEstado.PENDIENTE,
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
    usuario: raw.usuario
  };
}

function normalizeMensaje(raw: any): MensajeDTO {
  return {
    id: raw.id,
    contenido: raw.contenido,
    usuarioId: raw.usuarioId ?? raw.usuario_id,
    partidoId: raw.partidoId ?? raw.partido_id,
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
    usuario: raw.usuario
  };
}

// ============================================
// API DE USUARIOS
// ============================================

export const UsuarioAPI = {
  /**
   * Login con email y password
   */
  login: async (email: string, password: string) => {
    try {
      const response = await apiFetch<{ token: string; user: Usuario }>(
        '/api/auth/login-json',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
          skipAuth: true
        }
      );

      // Guardar token y usuario en localStorage
      if (response.success && response.data?.token) {
        AuthService.setToken(response.data.token);
        if (response.data.user) {
          AuthService.setUser(response.data.user);
        }
      }

      return response;
    } catch (error) {
      logger.error('[UsuarioAPI.login] Error:', error);
      return {
        success: false,
        data: null as any,
        message: error instanceof Error ? error.message : 'Error al iniciar sesión',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  /**
   * Obtener usuario actual (me)
   */
  getMe: async () => {
    try {
      return await apiFetch<Usuario>('/api/usuarios/me');
    } catch (error) {
      logger.error('[UsuarioAPI.getMe] Error:', error);
      return {
        success: false,
        data: null as any,
        message: error instanceof Error ? error.message : 'Error al obtener perfil',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  /**
   * Obtener usuario por ID
   */
  get: async (id: string) => {
    try {
      return await apiFetch<Usuario>(`/api/usuarios/${id}`);
    } catch (error) {
      logger.error('[UsuarioAPI.get] Error:', error);
      return {
        success: false,
        data: null as any,
        message: error instanceof Error ? error.message : 'Error al obtener usuario',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  /**
   * Listar usuarios
   */
  list: async () => {
    try {
      return await apiFetch<Usuario[]>('/api/usuarios', { 
        skipAutoLogout: true // Don't auto-logout on 401, handle error gracefully
      });
    } catch (error) {
      logger.error('[UsuarioAPI.list] Error:', error);
      return {
        success: false,
        data: [] as any,
        message: error instanceof Error ? error.message : 'Error al listar usuarios',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  /**
   * Crear usuario
   */
  crear: async (usuario: Partial<Usuario>) => {
    try {
      const payload = { ...usuario };
      // No enviar foto_perfil en creación (se sube después)
      delete payload.foto_perfil;
      
      logger.log('[UsuarioAPI.crear] Payload:', payload);
      
      return await apiFetch<{ token?: string; user: Usuario }>('/api/usuarios', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true
      });
    } catch (error) {
      logger.error('[UsuarioAPI.crear] Error:', error);
      return {
        success: false,
        data: null as any,
        message: error instanceof Error ? error.message : 'Error al crear usuario',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  /**
   * Actualizar perfil del usuario actual
   */
  actualizarPerfil: async (perfil: Partial<Usuario>) => {
    try {
      return await apiFetch<Usuario>('/api/usuarios/me', {
        method: 'PUT',
        body: JSON.stringify(perfil)
      });
    } catch (error) {
      logger.error('[UsuarioAPI.actualizarPerfil] Error:', error);
      return {
        success: false,
        data: null as any,
        message: error instanceof Error ? error.message : 'Error al actualizar perfil',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  /**
   * Subir foto de perfil
   */
  subirFoto: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      return await apiFetch<{ success: boolean }>('/api/usuarios/me/foto', {
        method: 'POST',
        body: formData
      });
    } catch (error) {
      logger.error('[UsuarioAPI.subirFoto] Error:', error);
      return {
        success: false,
        data: null as any,
        message: error instanceof Error ? error.message : 'Error al subir foto',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  /**
   * Verificar cédula
   */
  verificarCedula: async (cedula: string) => {
    try {
      return await apiFetch<{ verified: boolean; user?: Usuario }>(
        '/api/usuarios/me/verify-cedula',
        {
          method: 'POST',
          body: JSON.stringify({ cedula })
        }
      );
    } catch (error) {
      logger.error('[UsuarioAPI.verificarCedula] Error:', error);
      return {
        success: false,
        data: null as any,
        message: error instanceof Error ? error.message : 'Error al verificar cédula',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  /**
   * Eliminar cuenta del usuario actual
   */
  eliminarCuenta: async () => {
    try {
      return await apiFetch<{ success: boolean; message?: string }>(
        '/api/usuarios/me',
        {
          method: 'DELETE'
        }
      );
    } catch (error) {
      logger.error('[UsuarioAPI.eliminarCuenta] Error:', error);
      return {
        success: false,
        data: null as any,
        message: error instanceof Error ? error.message : 'Error al eliminar cuenta',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
};

// ============================================
// API DE PARTIDOS
// ============================================

export const PartidoAPI = {
  /**
   * Crear partido - CORREGIDO para coincidir con el backend
   */
  crear: async (partido: Partial<PartidoDTO>) => {
    logger.log("[PartidoAPI.crear] Datos recibidos:", partido);
    
    // Validar campos requeridos
    if (!partido.fecha) {
      return {
        success: false,
        message: "La fecha es requerida",
        data: null
      };
    }
    
    if (!partido.hora) {
      return {
        success: false,
        message: "La hora es requerida",
        data: null
      };
    }
    
    if (!partido.nombreUbicacion && !partido.nombre_ubicacion) {
      return {
        success: false,
        message: "La ubicación es requerida",
        data: null
      };
    }
    
    // Construir payload con snake_case para el backend
    const payload = {
      tipo_partido: partido.tipoPartido ?? partido.tipo_partido ?? 'FUTBOL_5',
      genero: partido.genero ?? 'Mixto',
      nivel: partido.nivel ?? 'INTERMEDIO',
      fecha: partido.fecha,
      hora: partido.hora,
      duracion_minutos: partido.duracionMinutos ?? partido.duracion_minutos ?? 90,
      nombre_ubicacion: partido.nombreUbicacion ?? partido.nombre_ubicacion,
      direccion_ubicacion: partido.direccionUbicacion ?? partido.direccion_ubicacion,
      latitud: partido.latitud,
      longitud: partido.longitud,
      cantidad_jugadores: partido.cantidadJugadores ?? partido.cantidad_jugadores ?? 10,
      precio_total: partido.precioTotal ?? partido.precio_total ?? 0,
      descripcion: partido.descripcion,
      organizador_id: partido.organizadorId ?? partido.organizador_id
    };

    logger.log("[PartidoAPI.crear] Payload a enviar:", payload);

    try {
      const response = await apiFetch<any>('/api/partidos', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      logger.log("[PartidoAPI.crear] Respuesta del servidor:", response);

      if (!response.success || !response.data) {
        logger.error("[PartidoAPI.crear] Error en respuesta:", response.message);
        return {
          success: false,
          message: response.message || "Error al crear el partido",
          data: null
        };
      }

      return {
        success: true,
        data: normalizePartido(response.data),
        message: "Partido creado exitosamente"
      };
      
    } catch (error: any) {
      logger.error("[PartidoAPI.crear] Error capturado:", error);
      
      return {
        success: false,
        message: error.message || "Error al crear el partido",
        data: null,
        error: error.message
      };
    }
  },

  /**
   * Obtener partido por ID
   */
  get: async (id: string) => {
    logger.log("[PartidoAPI.get] Solicitando partido ID:", id);
    
    try {
      const response = await apiFetch<any>(`/api/partidos/${id}`);
      
      logger.log("[PartidoAPI.get] Respuesta raw:", response);
      
      if (!response.success) {
        logger.error("[PartidoAPI.get] Error en respuesta:", response.message);
        return {
          success: false,
          message: response.message || "Partido no encontrado",
          data: null
        };
      }
      
      // Verificar que tengamos datos válidos
      if (!response.data) {
        logger.error("[PartidoAPI.get] Respuesta sin datos");
        return {
          success: false,
          message: "Partido no encontrado",
          data: null
        };
      }
      
      // Normalizar y retornar
      return {
        success: true,
        data: normalizePartido(response.data),
        message: response.message
      };
      
    } catch (error: any) {
      logger.error("[PartidoAPI.get] Error capturado:", error);
      
      // Manejar 404 específicamente
      if (error.message?.includes('404')) {
        return {
          success: false,
          message: "Partido no encontrado. Puede haber sido eliminado.",
          data: null,
          error: error.message
        };
      }
      
      // Otros errores
      return {
        success: false,
        message: error.message || "Error al obtener el partido",
        data: null,
        error: error.message
      };
    }
  },

  /**
   * Listar partidos con filtros - CORREGIDO
   */
  list: async (filtros?: {
    tipoPartido?: string;
    nivel?: string;
    genero?: string;
    fecha?: string;
    estado?: string;
    search?: string;
  }) => {
    logger.log("[PartidoAPI.list] Filtros:", filtros);
    
    try {
      const params = new URLSearchParams();
      
      if (filtros) {
        // Solo enviar filtros con valores definidos
        Object.entries(filtros).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value));
          }
        });
      }

      const query = params.toString();
      const endpoint = query ? `/api/partidos?${query}` : '/api/partidos';
      
      logger.log("[PartidoAPI.list] Endpoint:", endpoint);

      const response = await apiFetch<any>(endpoint);
      
      logger.log("[PartidoAPI.list] Respuesta raw:", response);
      
      // Extraer array de partidos de diferentes formatos de respuesta
      let partidos: any[] = [];
      
      if (Array.isArray(response)) {
        partidos = response;
      } else if (Array.isArray(response.data)) {
        partidos = response.data;
      } else if (response.data && typeof response.data === 'object') {
        partidos = response.data.items || response.data.content || [];
      } else {
        logger.warn("[PartidoAPI.list] Formato de respuesta inesperado");
        partidos = [];
      }
      
      logger.log("[PartidoAPI.list] Partidos a normalizar:", partidos.length);
      
      // Normalizar cada partido de forma segura
      const normalized = partidos
        .map((p: any) => {
          try {
            return normalizePartido(p);
          } catch (err) {
            logger.error("[PartidoAPI.list] Error normalizando partido:", err);
            logger.error("[PartidoAPI.list] Datos del partido problemático:", p);
            return null;
          }
        })
        .filter(Boolean) as PartidoDTO[];
      
      logger.log("[PartidoAPI.list] Partidos normalizados exitosamente:", normalized.length);
      
      return {
        success: true,
        data: normalized,
        message: `${normalized.length} partidos encontrados`
      };
      
    } catch (error: any) {
      logger.error("[PartidoAPI.list] Error:", error);
      
      return {
        success: false,
        data: [],
        message: error.message || "Error al cargar partidos",
        error: error.message
      };
    }
  },

  /**
   * Actualizar partido - CORREGIDO
   */
  actualizar: async (id: string, cambios: Partial<PartidoDTO>) => {
    logger.log("[PartidoAPI.actualizar] ID:", id, "Cambios:", cambios);
    
    // Convertir a snake_case para el backend
    const payload: any = {};
    
    if (cambios.fecha !== undefined) payload.fecha = cambios.fecha;
    if (cambios.hora !== undefined) payload.hora = cambios.hora;
    if (cambios.nombreUbicacion !== undefined) 
      payload.nombre_ubicacion = cambios.nombreUbicacion;
    if (cambios.cantidadJugadores !== undefined) 
      payload.cantidad_jugadores = cambios.cantidadJugadores;
    if (cambios.precioTotal !== undefined) 
      payload.precio_total = cambios.precioTotal;
    if (cambios.descripcion !== undefined) 
      payload.descripcion = cambios.descripcion;
    if (cambios.duracionMinutos !== undefined) 
      payload.duracion_minutos = cambios.duracionMinutos;
    
    const response = await apiFetch<any>(`/api/partidos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    logger.log("[PartidoAPI.actualizar] Respuesta:", response);

    return {
      ...response,
      data: normalizePartido(response.data)
    };
  },

  /**
   * Resto de métodos mantienen la misma estructura...
   */
  cancelar: (id: string, motivo?: string) => {
    return apiFetch<void>(`/api/partidos/${id}/cancelar`, {
      method: 'POST',
      body: motivo ? JSON.stringify({ motivo }) : undefined
    });
  },

  confirmar: (id: string) => {
    return apiFetch<void>(`/api/partidos/${id}/confirmar`, {
      method: 'POST'
    });
  },

  completar: (id: string) => {
    return apiFetch<void>(`/api/partidos/${id}/completar`, {
      method: 'POST'
    });
  },

  getJugadores: async (id: string) => {
    const response = await apiFetch<any>(`/api/partidos/${id}/jugadores`);
    
    // Normalizar jugadores
    const jugadores = (response.data ?? []).map((j: any) => ({
      id: j.id,
      nombre: j.nombre,
      apellido: j.apellido,
      foto_perfil: j.fotoPerfil ?? j.foto_perfil,
      posicion: j.posicion,
      rating: j.rating
    }));
    
    return {
      ...response,
      data: jugadores
    };
  },

  removerJugador: (partidoId: string, jugadorId: string) => {
    return apiFetch<void>(`/api/partidos/${partidoId}/jugadores/${jugadorId}`, {
      method: 'DELETE'
    });
  },

  eliminar: (id: string) => {
    return apiFetch<void>(`/api/partidos/${id}`, {
      method: 'DELETE'
    });
  },

  /**
   * Listar partidos de un usuario - CORREGIDO
   */
  listByUser: async (usuarioId: string) => {
    logger.log("[PartidoAPI.listByUser] Usuario ID:", usuarioId);
    
    try {
      const response = await apiFetch<any>(`/api/partidos/usuario/${usuarioId}`);
      
      logger.log("[PartidoAPI.listByUser] Respuesta raw:", response);
      
      let partidos: any[] = [];
      
      if (Array.isArray(response)) {
        partidos = response;
      } else if (Array.isArray(response.data)) {
        partidos = response.data;
      } else if (response.data && typeof response.data === 'object') {
        partidos = response.data.items || response.data.content || [];
      } else {
        partidos = [];
      }
      
      const normalized = partidos.map((p: any) => {
        try {
          return normalizePartido(p);
        } catch (err) {
          logger.error("[PartidoAPI.listByUser] Error normalizando:", p, err);
          return null;
        }
      }).filter(Boolean) as PartidoDTO[];
      
      return {
        success: true,
        data: normalized
      };
      
    } catch (error) {
      logger.error("[PartidoAPI.listByUser] Error:", error);
      
      if (error instanceof Error && error.message.includes('500')) {
        return {
          success: false,
          data: [],
          message: "Error del servidor al cargar partidos"
        };
      }
      
      throw error;
    }
  },

  /**
   * Invitar usuario a un partido
   */
  invitarJugador: async (partidoId: string, usuarioId: string) => {
    logger.log("[PartidoAPI.invitarJugador] Partido:", partidoId, "Usuario:", usuarioId);
    
    return apiFetch<{ success: boolean; message?: string }>(
      `/api/partidos/${partidoId}/invitar`,
      {
        method: 'POST',
        body: JSON.stringify({ usuarioId })
      }
    );
  },

  /**
   * Obtener partidos del usuario (creados e inscriptos)
   */
  misPartidos: async (usuarioId: string) => {
    logger.log("[PartidoAPI.misPartidos] Usuario:", usuarioId);
    
    try {
      const response = await apiFetch<any>(`/api/partidos/usuario/${usuarioId}`);
      
      logger.log("[PartidoAPI.misPartidos] Respuesta raw:", response);
      
      // Extraer array de partidos
      let partidos: any[] = [];
      
      if (Array.isArray(response)) {
        partidos = response;
      } else if (Array.isArray(response.data)) {
        partidos = response.data;
      } else if (response.data && typeof response.data === 'object') {
        partidos = response.data.items || response.data.content || [];
      }
      
      // Normalizar de forma segura
      const normalized = partidos
        .map((p: any) => {
          try {
            return normalizePartido(p);
          } catch (err) {
            logger.error("[PartidoAPI.misPartidos] Error normalizando:", err);
            return null;
          }
        })
        .filter(Boolean) as PartidoDTO[];
      
      return {
        success: true,
        data: normalized
      };
      
    } catch (error: any) {
      logger.error("[PartidoAPI.misPartidos] Error:", error);
      
      // Si es 404 o 500, retornar array vacío
      if (error.message?.includes('404') || error.message?.includes('500')) {
        logger.warn("[PartidoAPI.misPartidos] Backend no disponible, retornando array vacío");
        return {
          success: true,
          data: [],
          message: "No hay partidos disponibles"
        };
      }
      
      throw error;
    }
  },
};


// ============================================
// API DE INSCRIPCIONES
// ============================================

export const InscripcionAPI = {
  /**
   * Crear inscripción (solicitar unirse a partido)
   */
  crear: async (partidoId: string, usuarioId: string) => {
    const response = await apiFetch<InscripcionDTO>('/api/inscripciones', {
      method: 'POST',
      body: JSON.stringify({ partidoId, usuarioId })
    });

    return {
      ...response,
      data: normalizeInscripcion(response.data)
    };
  },

  /**
   * Listar inscripciones de un usuario
   */
  listByUser: async (usuarioId: string, estado?: InscripcionEstado) => {
    const query = estado ? `?estado=${estado}` : '';
    const response = await apiFetch<InscripcionDTO[]>(
      `/api/inscripciones/usuario/${usuarioId}${query}`
    );

    return {
      ...response,
      data: response.data.map(normalizeInscripcion)
    };
  },

  /**
   * Listar inscripciones de un partido
   */
  listByPartido: async (partidoId: string, estado?: InscripcionEstado) => {
    const query = estado ? `?estado=${estado}` : '';
    const response = await apiFetch<InscripcionDTO[]>(
      `/api/inscripciones/partido/${partidoId}${query}`
    );

    return {
      ...response,
      data: response.data.map(normalizeInscripcion)
    };
  },

  /**
   * Obtener solicitudes pendientes de un partido
   */
  getPendientes: async (partidoId: string) => {
    logger.log("[InscripcionAPI.getPendientes] Partido ID:", partidoId);
    
    const response = await apiFetch<InscripcionDTO[]>(
      `/api/partidos/${partidoId}/solicitudes`
    );

    logger.log("[InscripcionAPI.getPendientes] Respuesta:", response);

    return {
      ...response,
      data: response.data.map(normalizeInscripcion)
    };
  },
  
  /**
   * Aceptar inscripción
   */
  aceptar: async (inscripcionId: string) => {
    const response = await apiFetch<InscripcionDTO>(
      `/api/inscripciones/${inscripcionId}/aceptar`,
      { method: 'POST' }
    );

    return {
      ...response,
      data: normalizeInscripcion(response.data)
    };
  },

  /**
   * Rechazar inscripción
   */
  rechazar: (inscripcionId: string, motivo?: string) => {
    return apiFetch<void>(`/api/inscripciones/${inscripcionId}/rechazar`, {
      method: 'POST',
      body: motivo ? JSON.stringify({ motivo }) : undefined
    });
  },

  /**
   * Cancelar inscripción
   */
  cancelar: (inscripcionId: string) => {
    return apiFetch<void>(`/api/inscripciones/${inscripcionId}`, {
      method: 'DELETE'
    });
  },

  /**
   * Obtener estado de inscripción
   */
  getEstado: (partidoId: string, usuarioId: string) => {
    return apiFetch<{
      inscrito: boolean;
      estado: InscripcionEstado | null;
      inscripcionId?: string;
    }>(`/api/inscripciones/estado?partidoId=${partidoId}&usuarioId=${usuarioId}`);
  }
};

// ============================================
// API DE MENSAJES
// ============================================

export const MensajeAPI = {
  /**
   * Listar mensajes de un partido
   */
  list: async (partidoId: string) => {
    const response = await apiFetch<MensajeDTO[]>(
      `/api/partidos/${partidoId}/mensajes`
    );

    return {
      ...response,
      data: response.data.map(normalizeMensaje)
    };
  },

  /**
   * Crear mensaje (usuarioId se obtiene automáticamente del token)
   */
  crear: async (partidoId: string, data: { contenido: string }) => {
    const response = await apiFetch<MensajeDTO>(
      `/api/partidos/${partidoId}/mensajes`,
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    );

    return {
      ...response,
      data: normalizeMensaje(response.data)
    };
  }
};

// ============================================
// API DE REVIEWS
// ============================================

export const ReviewAPI = {
  /**
   * Crear review
   */
  crear: (review: Omit<ReviewDTO, 'id' | 'createdAt'>) => {
    return apiFetch<ReviewDTO>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(review)
    });
  },

  /**
   * Listar reviews de un usuario
   */
  listByUser: (usuarioCalificadoId: string) => {
    return apiFetch<ReviewDTO[]>(
      `/api/reviews/usuario/${usuarioCalificadoId}`
    );
  },

  /**
   * Listar reviews de un partido
   */
  listByPartido: (partidoId: string) => {
    return apiFetch<ReviewDTO[]>(`/api/reviews/partido/${partidoId}`);
  }
};

// ============================================
// API DE NOTIFICACIONES
// ============================================

export const NotificacionAPI = {
  /**
   * Obtener todas las notificaciones del usuario actual
   */
  list: async () => {
    try {
      return await apiFetch<NotificacionDTO[]>('/api/notificaciones');
    } catch (error) {
      logger.error('[NotificacionAPI.list] Error:', error);
      return {
        success: false,
        data: [],
        message: error instanceof Error ? error.message : 'Error al listar notificaciones',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  /**
   * Obtener notificaciones no leídas
   */
  getNoLeidas: async () => {
    try {
      return await apiFetch<NotificacionDTO[]>('/api/notificaciones/no-leidas');
    } catch (error) {
      logger.error('[NotificacionAPI.getNoLeidas] Error:', error);
      return {
        success: false,
        data: [],
        message: error instanceof Error ? error.message : 'Error al obtener notificaciones',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  /**
   * Contar notificaciones no leídas
   */
  count: async () => {
    try {
      // Use built-in retry logic from apiFetch (no custom timeout needed)
      const response = await apiFetch<{ count: number }>('/api/notificaciones/count')
      return response
    } catch (error) {
      logger.error('[NotificacionAPI.count] Error:', error);
      // Return 0 count on error to prevent UI breaks
      return {
        success: false,
        data: { count: 0 } as any,
        message: error instanceof Error ? error.message : 'Error al contar notificaciones',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  /**
   * Marcar notificación como leída
   */
  marcarLeida: async (id: string) => {
    try {
      return await apiFetch<NotificacionDTO>(`/api/notificaciones/${id}/leer`, {
        method: 'PUT'
      });
    } catch (error) {
      logger.error('[NotificacionAPI.marcarLeida] Error:', error);
      return {
        success: false,
        data: null as any,
        message: error instanceof Error ? error.message : 'Error al marcar notificación',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  /**
   * Marcar todas las notificaciones como leídas
   */
  marcarTodasLeidas: async () => {
    try {
      return await apiFetch<{ count: number }>('/api/notificaciones/leer-todas', {
        method: 'PUT'
      });
    } catch (error) {
      logger.error('[NotificacionAPI.marcarTodasLeidas] Error:', error);
      return {
        success: false,
        data: { count: 0 } as any,
        message: error instanceof Error ? error.message : 'Error al marcar notificaciones',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  /**
   * Eliminar notificación
   */
  eliminar: async (id: string) => {
    try {
      return await apiFetch<void>(`/api/notificaciones/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      logger.error('[NotificacionAPI.eliminar] Error:', error);
      return {
        success: false,
        data: null as any,
        message: error instanceof Error ? error.message : 'Error al eliminar notificación',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
};

// ============================================
// API DE PREFERENCIAS DE NOTIFICACIÓN
// ============================================

export interface NotificationPreferences {
  matchInvitations: boolean;
  friendRequests: boolean;
  matchUpdates: boolean;
  reviewRequests: boolean;
  newMessages: boolean;
  generalUpdates: boolean;
}

export const NotificationPreferencesAPI = {
  /**
   * Obtener preferencias de notificación del usuario actual
   */
  get: async () => {
    try {
      return await apiFetch<NotificationPreferences>('/api/usuarios/me/notification-preferences');
    } catch (error) {
      logger.error('[NotificationPreferencesAPI.get] Error:', error);
      return {
        success: false,
        data: null as any,
        message: error instanceof Error ? error.message : 'Error al obtener preferencias',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  /**
   * Actualizar preferencias de notificación
   */
  update: async (preferences: Partial<NotificationPreferences>) => {
    try {
      return await apiFetch<NotificationPreferences>('/api/usuarios/me/notification-preferences', {
        method: 'PUT',
        body: JSON.stringify(preferences)
      });
    } catch (error) {
      logger.error('[NotificationPreferencesAPI.update] Error:', error);
      return {
        success: false,
        data: null as any,
        message: error instanceof Error ? error.message : 'Error al actualizar preferencias',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
};

// ============================================
// API DE AMISTADES
// ============================================

export interface AmistadDTO {
  id: string;
  usuario1Id: string;
  usuario2Id: string;
  estado: string;
  fechaSolicitud: string;
  fechaAceptacion?: string;
  amigo?: Usuario; // Usuario del otro lado de la amistad
}

export const AmistadAPI = {
  /**
   * Obtener lista de amigos del usuario actual (solo aceptados)
   */
  listarAmigos: async () => {
    try {
      const response = await apiFetch<any[]>('/api/amistades');
      return {
        ...response,
        data: response.data?.map((a: any) => ({
          id: a.id,
          usuario1Id: a.usuario1Id || a.usuario1_id,
          usuario2Id: a.usuario2Id || a.usuario2_id,
          estado: a.estado,
          fechaSolicitud: a.fechaSolicitud || a.fecha_solicitud,
          fechaAceptacion: a.fechaAceptacion || a.fecha_aceptacion,
          amigo: a.amigo
        })) || []
      };
    } catch (error) {
      logger.error('[AmistadAPI.listarAmigos] Error:', error);
      return {
        success: false,
        data: [],
        message: error instanceof Error ? error.message : 'Error al listar amigos',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  /**
   * Obtener solicitudes de amistad pendientes (recibidas)
   */
  listarSolicitudesPendientes: async () => {
    try {
      const response = await apiFetch<any[]>('/api/amistades/pendientes');
      return {
        ...response,
        data: response.data || []
      };
    } catch (error) {
      logger.error('[AmistadAPI.listarSolicitudesPendientes] Error:', error);
      return {
        success: false,
        data: [],
        message: error instanceof Error ? error.message : 'Error al listar solicitudes',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  /**
   * Obtener solicitudes de amistad enviadas
   */
  listarSolicitudesEnviadas: async () => {
    try {
      const response = await apiFetch<any[]>('/api/amistades/enviadas');
      return {
        ...response,
        data: response.data || []
      };
    } catch (error) {
      logger.error('[AmistadAPI.listarSolicitudesEnviadas] Error:', error);
      return {
        success: false,
        data: [],
        message: error instanceof Error ? error.message : 'Error al listar solicitudes enviadas',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  /**
   * Enviar solicitud de amistad
   */
  enviarSolicitud: async (usuarioId: string) => {
    try {
      return await apiFetch<void>(`/api/amistades/${usuarioId}`, {
        method: 'POST'
      });
    } catch (error) {
      logger.error('[AmistadAPI.enviarSolicitud] Error:', error);
      return {
        success: false,
        data: null as any,
        message: error instanceof Error ? error.message : 'Error al enviar solicitud',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  /**
   * Aceptar solicitud de amistad
   */
  aceptarSolicitud: async (amistadId: string) => {
    try {
      return await apiFetch<void>(`/api/amistades/${amistadId}/aceptar`, {
        method: 'POST'
      });
    } catch (error) {
      logger.error('[AmistadAPI.aceptarSolicitud] Error:', error);
      return {
        success: false,
        data: null as any,
        message: error instanceof Error ? error.message : 'Error al aceptar solicitud',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  /**
   * Rechazar solicitud de amistad
   */
  rechazarSolicitud: async (amistadId: string) => {
    try {
      return await apiFetch<void>(`/api/amistades/${amistadId}/rechazar`, {
        method: 'POST'
      });
    } catch (error) {
      logger.error('[AmistadAPI.rechazarSolicitud] Error:', error);
      return {
        success: false,
        data: null as any,
        message: error instanceof Error ? error.message : 'Error al rechazar solicitud',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  /**
   * Eliminar amistad
   */
  eliminarAmistad: async (amistadId: string) => {
    try {
      return await apiFetch<void>(`/api/amistades/${amistadId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      logger.error('[AmistadAPI.eliminarAmistad] Error:', error);
      return {
        success: false,
        data: null as any,
        message: error instanceof Error ? error.message : 'Error al eliminar amistad',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
};

// ============================================
// HELPER: Mapear form data a PartidoDTO
// ============================================

export function mapFormDataToPartidoDTO(formData: {
  type: string;
  gender: string;
  date: string;
  time: string;
  location: string;
  totalPlayers: number;
  totalPrice: number;
  description: string;
  duration: number;
  locationCoordinates?: { lat: number; lng: number } | null;
  organizadorId: string;
}): Partial<PartidoDTO> {
  // Asegurar formato de hora correcto (HH:mm:ss)
  let horaFormateada = formData.time;
  if (!horaFormateada.includes(':')) {
    horaFormateada = `${horaFormateada}:00:00`;
  } else if (horaFormateada.split(':').length === 2) {
    horaFormateada = `${horaFormateada}:00`;
  }

  return {
    // Enviar en ambos formatos para compatibilidad
    tipoPartido: formData.type,
    tipo_partido: formData.type,
    genero: formData.gender,
    nivel: 'INTERMEDIO',
    fecha: formData.date,
    hora: horaFormateada,
    duracionMinutos: formData.duration,
    duracion_minutos: formData.duration,
    nombreUbicacion: formData.location,
    nombre_ubicacion: formData.location,
    direccionUbicacion: formData.location,
    direccion_ubicacion: formData.location,
    latitud: formData.locationCoordinates?.lat,
    longitud: formData.locationCoordinates?.lng,
    cantidadJugadores: formData.totalPlayers,
    cantidad_jugadores: formData.totalPlayers,
    precioTotal: formData.totalPrice,
    precio_total: formData.totalPrice,
    descripcion: formData.description || undefined,
    estado: 'PENDIENTE',
    organizadorId: formData.organizadorId,
    organizador_id: formData.organizadorId
  };
}