import { AuthService } from "./auth";

// ============================================
// CONFIGURACIÓN
// ============================================

const getApiBase = (): string => {
  // ✅ En el servidor (SSR/SSG) - Comunicación via red Docker 'appnet'
  if (typeof window === 'undefined') {
    const serverUrl = process.env.API_URL || 'http://backend:8080';
    console.log('[API Config SSR] Using Docker network (appnet):', serverUrl);
    return serverUrl;
  }
  
  // ✅ En el navegador - Acceso al puerto expuesto en localhost
  const clientUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  console.log('[API Config Browser] Using public URL:', clientUrl);
  
  // 🔒 Protección: Si detectamos un hostname interno de Docker en el navegador, forzar localhost
  if (clientUrl.includes('backend') || clientUrl.includes('appnet')) {
    console.warn('[API Config] ⚠️ Detectado hostname Docker en navegador, forzando localhost:8080');
    return 'http://localhost:8080';
  }
  
  return clientUrl;
};

export const API_BASE = getApiBase();

// Normalizar URLs (eliminar barras duplicadas)
export const normalizeUrl = (url: string) => url.replace(/([^:]\/)\/+/g, '$1');

console.log('[API Config] Final API_BASE:', API_BASE);
console.log('[API Config] Environment:', typeof window === 'undefined' ? 'SERVER (SSR)' : 'BROWSER');

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
  PENDIENTE = "PENDIENTE",
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
}

async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<ApiResponse<T>> {
  const { skipAuth = false, customToken, ...fetchOptions } = options;

  // Validar y limpiar tokens expirados
  if (!skipAuth) {
    AuthService.validateAndCleanup();
  }

  // Obtener token
  const token = customToken || (!skipAuth ? AuthService.getToken() : null);
  
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

  console.log(`[API] ${fetchOptions.method || 'GET'} ${endpoint}`);

  try {
    const response = await fetch(fullUrl, {
      ...fetchOptions,
      headers,
    });

    // Manejo de 401 - Sesión expirada
    if (response.status === 401) {
      console.warn('[API] 401 Unauthorized - Limpiando sesión');
      AuthService.logout();
      
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      
      throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
    }

    // Manejo de 403 - Sin permisos
    if (response.status === 403) {
      throw new Error('No tienes permisos para realizar esta acción');
    }

    // Obtener texto de respuesta
    const responseText = await response.text();
    
    // Intentar parsear JSON
    let responseData: any;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      console.error('[API] Error parseando respuesta:', responseText);
      throw new Error('Respuesta inválida del servidor');
    }

    // Si la respuesta no es OK
    if (!response.ok) {
      const errorMessage = responseData.message 
        || responseData.error 
        || `Error ${response.status}: ${response.statusText}`;
      
      console.error(`[API] Error ${response.status}:`, errorMessage);
      
      throw new Error(errorMessage);
    }

    // Normalizar respuesta
    const normalizedResponse: ApiResponse<T> = {
      success: responseData.success ?? true,
      data: responseData.data ?? responseData,
      message: responseData.message,
      error: responseData.error
    };

    console.log(`[API] ✓ ${endpoint} completado`);
    
    return normalizedResponse;

  } catch (error) {
    console.error(`[API] Error en ${endpoint}:`, error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Error de red. Verifica tu conexión.');
  }
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
    estado: raw.estado ?? 'PENDIENTE',
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
    const response = await apiFetch<{ token: string; user: Usuario }>(
      '/api/auth/login-json',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuth: true
      }
    );

    // Guardar token y usuario en localStorage
    if (response.success && response.data.token) {
      AuthService.setToken(response.data.token);
      AuthService.setUser(response.data.user);
    }

    return response;
  },

  /**
   * Obtener usuario actual (me)
   */
  getMe: () => apiFetch<Usuario>('/api/usuarios/me'),

  /**
   * Obtener usuario por ID
   */
  get: (id: string) => apiFetch<Usuario>(`/api/usuarios/${id}`),

  /**
   * Listar usuarios
   */
  list: () => apiFetch<Usuario[]>('/api/usuarios'),

  /**
   * Crear usuario
   */
  crear: (usuario: Partial<Usuario>) => {
    const payload = { ...usuario };
    // No enviar foto_perfil en creación (se sube después)
    delete payload.foto_perfil;
    
    console.log('[UsuarioAPI.crear] Payload:', payload);
    
    return apiFetch<{ token?: string; user: Usuario }>('/api/usuarios', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true
    });
  },

  /**
   * Actualizar perfil del usuario actual
   */
  actualizarPerfil: (perfil: Partial<Usuario>) => {
    return apiFetch<Usuario>('/api/usuarios/me', {
      method: 'PUT',
      body: JSON.stringify(perfil)
    });
  },

  /**
   * Subir foto de perfil
   */
  subirFoto: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return apiFetch<{ success: boolean }>('/api/usuarios/me/foto', {
      method: 'POST',
      body: formData
    });
  },

  /**
   * Verificar cédula
   */
  verificarCedula: (cedula: string) => {
    return apiFetch<{ verified: boolean; user?: Usuario }>(
      '/api/usuarios/me/verify-cedula',
      {
        method: 'POST',
        body: JSON.stringify({ cedula })
      }
    );
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
    console.log("[PartidoAPI.crear] Enviando:", partido);
    
    // El backend espera snake_case
    const payload = {
      tipo_partido: partido.tipoPartido ?? partido.tipo_partido,
      genero: partido.genero,
      nivel: partido.nivel ?? 'INTERMEDIO',
      fecha: partido.fecha,
      hora: partido.hora,
      duracion_minutos: partido.duracionMinutos ?? partido.duracion_minutos ?? 90,
      nombre_ubicacion: partido.nombreUbicacion ?? partido.nombre_ubicacion,
      direccion_ubicacion: partido.direccionUbicacion ?? partido.direccion_ubicacion,
      latitud: partido.latitud,
      longitud: partido.longitud,
      cantidad_jugadores: partido.cantidadJugadores ?? partido.cantidad_jugadores,
      precio_total: partido.precioTotal ?? partido.precio_total ?? 0,
      descripcion: partido.descripcion,
      organizador_id: partido.organizadorId ?? partido.organizador_id
    };

    console.log("[PartidoAPI.crear] Payload normalizado:", payload);

    const response = await apiFetch<any>('/api/partidos', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    console.log("[PartidoAPI.crear] Respuesta:", response);

    return {
      ...response,
      data: normalizePartido(response.data)
    };
  },

  /**
   * Obtener partido por ID
   */
  get: async (id: string) => {
    console.log("[PartidoAPI.get] ID:", id);
    
    const response = await apiFetch<any>(`/api/partidos/${id}`);
    
    console.log("[PartidoAPI.get] Respuesta raw:", response);
    
    return {
      ...response,
      data: normalizePartido(response.data)
    };
  },

  /**
   * Listar partidos con filtros - CORREGIDO
   */
  list: async (filtros?: {
    tipoPartido?: string;
    tipo_partido?: string;
    nivel?: string;
    genero?: string;
    fecha?: string;
    estado?: string;
    search?: string;
    latitud?: number;
    longitud?: number;
    radioKm?: number;
  }) => {
    console.log("[PartidoAPI.list] Filtros:", filtros);
    
    const params = new URLSearchParams();
    
    if (filtros) {
      // Convertir camelCase a snake_case para el backend
      const backendFiltros: any = {
        tipo_partido: filtros.tipoPartido ?? filtros.tipo_partido,
        nivel: filtros.nivel,
        genero: filtros.genero,
        fecha: filtros.fecha,
        estado: filtros.estado,
        search: filtros.search,
        latitud: filtros.latitud,
        longitud: filtros.longitud,
        radioKm: filtros.radioKm
      };

      Object.entries(backendFiltros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    const query = params.toString();
    const endpoint = query ? `/api/partidos?${query}` : '/api/partidos';
    
    console.log("[PartidoAPI.list] Endpoint:", endpoint);

    try {
      const response = await apiFetch<any>(endpoint);
      
      console.log("[PartidoAPI.list] Respuesta raw:", response);
      
      // Manejar diferentes formatos de respuesta
      let partidos: any[] = [];
      
      if (Array.isArray(response)) {
        partidos = response;
      } else if (Array.isArray(response.data)) {
        partidos = response.data;
      } else if (response.data && typeof response.data === 'object') {
        partidos = response.data.items || response.data.content || [];
      } else {
        console.warn("[PartidoAPI.list] Formato de respuesta inesperado:", response);
        partidos = [];
      }
      
      console.log("[PartidoAPI.list] Partidos a normalizar:", partidos.length);
      
      const normalized = partidos.map((p: any) => {
        try {
          return normalizePartido(p);
        } catch (err) {
          console.error("[PartidoAPI.list] Error normalizando partido:", p, err);
          return null;
        }
      }).filter(Boolean) as PartidoDTO[];
      
      console.log("[PartidoAPI.list] Partidos normalizados:", normalized.length);
      
      return {
        success: true,
        data: normalized
      };
      
    } catch (error) {
      console.error("[PartidoAPI.list] Error:", error);
      throw error;
    }
  },

  /**
   * Actualizar partido - CORREGIDO
   */
  actualizar: async (id: string, cambios: Partial<PartidoDTO>) => {
    console.log("[PartidoAPI.actualizar] ID:", id, "Cambios:", cambios);
    
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

    console.log("[PartidoAPI.actualizar] Respuesta:", response);

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
    console.log("[PartidoAPI.listByUser] Usuario ID:", usuarioId);
    
    try {
      const response = await apiFetch<any>(`/api/partidos/usuario/${usuarioId}`);
      
      console.log("[PartidoAPI.listByUser] Respuesta raw:", response);
      
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
          console.error("[PartidoAPI.listByUser] Error normalizando:", p, err);
          return null;
        }
      }).filter(Boolean) as PartidoDTO[];
      
      return {
        success: true,
        data: normalized
      };
      
    } catch (error) {
      console.error("[PartidoAPI.listByUser] Error:", error);
      
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
    console.log("[PartidoAPI.invitarJugador] Partido:", partidoId, "Usuario:", usuarioId);
    
    return apiFetch<{ success: boolean; message?: string }>(
      `/api/partidos/${partidoId}/invitar`,
      {
        method: 'POST',
        body: JSON.stringify({ usuarioId })
      }
    );
  }
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
    console.log("[InscripcionAPI.getPendientes] Partido ID:", partidoId);
    
    const response = await apiFetch<InscripcionDTO[]>(
      `/api/partidos/${partidoId}/solicitudes`
    );

    console.log("[InscripcionAPI.getPendientes] Respuesta:", response);

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
   * Crear mensaje
   */
  crear: async (partidoId: string, data: { contenido: string; usuarioId: string }) => {
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
      `/api/reviews?usuarioCalificadoId=${usuarioCalificadoId}`
    );
  },

  /**
   * Listar reviews de un partido
   */
  listByPartido: (partidoId: string) => {
    return apiFetch<ReviewDTO[]>(`/api/reviews?partidoId=${partidoId}`);
  }
};

// ============================================
// API DE NOTIFICACIONES
// ============================================

export const NotificacionAPI = {
  /**
   * Obtener todas las notificaciones del usuario actual
   */
  list: () => {
    return apiFetch<NotificacionDTO[]>('/api/notificaciones');
  },

  /**
   * Obtener notificaciones no leídas
   */
  getNoLeidas: () => {
    return apiFetch<NotificacionDTO[]>('/api/notificaciones/no-leidas');
  },

  /**
   * Contar notificaciones no leídas
   */
  count: () => {
    return apiFetch<{ count: number }>('/api/notificaciones/count');
  },

  /**
   * Marcar notificación como leída
   */
  marcarLeida: (id: string) => {
    return apiFetch<NotificacionDTO>(`/api/notificaciones/${id}/leer`, {
      method: 'PUT'
    });
  },

  /**
   * Marcar todas las notificaciones como leídas
   */
  marcarTodasLeidas: () => {
    return apiFetch<{ count: number }>('/api/notificaciones/leer-todas', {
      method: 'PUT'
    });
  },

  /**
   * Eliminar notificación
   */
  eliminar: (id: string) => {
    return apiFetch<void>(`/api/notificaciones/${id}`, {
      method: 'DELETE'
    });
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