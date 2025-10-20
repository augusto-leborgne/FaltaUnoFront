import { AuthService } from "./auth";

// ============================================
// CONFIGURACIÓN
// ============================================

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
export const API_BASE = typeof window === 'undefined' ? RAW_API_BASE : '';

// Normalizar URLs (eliminar barras duplicadas)
export const normalizeUrl = (url: string) => url.replace(/([^:]\/)\/+/g, '$1');

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
  // Campos principales (backend usa camelCase)
  id?: string;
  tipoPartido: string; // FUTBOL_5, FUTBOL_7, etc.
  genero: string; // Mixto, Hombres, Mujeres
  nivel?: string; // PRINCIPIANTE, INTERMEDIO, AVANZADO
  fecha: string; // yyyy-MM-dd
  hora: string; // HH:mm:ss
  duracionMinutos: number;
  nombreUbicacion: string;
  direccionUbicacion?: string;
  latitud?: number;
  longitud?: number;
  cantidadJugadores: number;
  jugadoresActuales: number;
  precioTotal: number;
  precioPorJugador: number;
  descripcion?: string;
  estado: PartidoEstado;
  organizadorId: string;
  createdAt?: string;
  
  // Relaciones
  organizador?: UsuarioMinDTO;
  jugadores?: UsuarioMinDTO[];
  solicitudesPendientes?: InscripcionDTO[];
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
  // Calcular precio por jugador si no viene
  const precioTotal = raw.precioTotal ?? raw.precio_total ?? 0;
  const cantidadJugadores = raw.cantidadJugadores ?? raw.cantidad_jugadores ?? 1;
  const precioPorJugador = raw.precioPorJugador 
    ?? raw.precio_por_jugador 
    ?? (cantidadJugadores > 0 ? precioTotal / cantidadJugadores : 0);

  return {
    id: raw.id,
    tipoPartido: raw.tipoPartido ?? raw.tipo_partido ?? TipoPartido.FUTBOL_5,
    genero: raw.genero ?? 'Mixto',
    nivel: raw.nivel ?? NivelPartido.INTERMEDIO,
    fecha: raw.fecha,
    hora: raw.hora,
    duracionMinutos: raw.duracionMinutos ?? raw.duracion_minutos ?? 90,
    nombreUbicacion: raw.nombreUbicacion ?? raw.nombre_ubicacion ?? '',
    direccionUbicacion: raw.direccionUbicacion ?? raw.direccion_ubicacion,
    latitud: raw.latitud ?? null,
    longitud: raw.longitud ?? null,
    cantidadJugadores,
    jugadoresActuales: raw.jugadoresActuales ?? raw.jugadores_actuales ?? 0,
    precioTotal,
    precioPorJugador: Math.round(precioPorJugador * 100) / 100,
    descripcion: raw.descripcion,
    estado: raw.estado ?? PartidoEstado.PENDIENTE,
    organizadorId: raw.organizadorId ?? raw.organizador_id,
    createdAt: raw.createdAt ?? raw.created_at,
    organizador: raw.organizador,
    jugadores: raw.jugadores ?? [],
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
    
    return apiFetch<Usuario>('/api/usuarios', {
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
   * Crear partido
   */
  crear: async (partido: Omit<PartidoDTO, 'id' | 'createdAt' | 'jugadoresActuales' | 'precioPorJugador'>) => {
    console.log("[PartidoAPI.crear] Enviando:", partido);
    
    const response = await apiFetch<PartidoDTO>('/api/partidos', {
      method: 'POST',
      body: JSON.stringify({
        tipoPartido: partido.tipoPartido,
        genero: partido.genero,
        nivel: partido.nivel ?? NivelPartido.INTERMEDIO,
        fecha: partido.fecha,
        hora: partido.hora,
        duracionMinutos: partido.duracionMinutos,
        nombreUbicacion: partido.nombreUbicacion,
        direccionUbicacion: partido.direccionUbicacion,
        latitud: partido.latitud,
        longitud: partido.longitud,
        cantidadJugadores: partido.cantidadJugadores,
        precioTotal: partido.precioTotal,
        descripcion: partido.descripcion,
        organizadorId: partido.organizadorId
      })
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
   * Listar partidos con filtros
   */
  list: async (filtros?: {
    tipoPartido?: string;
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
      Object.entries(filtros).forEach(([key, value]) => {
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
        // Si data es un objeto con items o similar
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
   * Listar partidos de un usuario
   */
  listByUser: async (usuarioId: string) => {
    console.log("[PartidoAPI.listByUser] Usuario ID:", usuarioId);
    
    try {
      const response = await apiFetch<any>(`/api/partidos/usuario/${usuarioId}`);
      
      console.log("[PartidoAPI.listByUser] Respuesta raw:", response);
      
      // Manejar diferentes formatos de respuesta
      let partidos: any[] = [];
      
      if (Array.isArray(response)) {
        partidos = response;
      } else if (Array.isArray(response.data)) {
        partidos = response.data;
      } else if (response.data && typeof response.data === 'object') {
        partidos = response.data.items || response.data.content || [];
      } else {
        console.warn("[PartidoAPI.listByUser] Formato inesperado:", response);
        partidos = [];
      }
      
      console.log("[PartidoAPI.listByUser] Partidos a normalizar:", partidos.length);
      
      const normalized = partidos.map((p: any) => {
        try {
          return normalizePartido(p);
        } catch (err) {
          console.error("[PartidoAPI.listByUser] Error normalizando:", p, err);
          return null;
        }
      }).filter(Boolean) as PartidoDTO[];
      
      console.log("[PartidoAPI.listByUser] Partidos normalizados:", normalized.length);
      
      return {
        success: true,
        data: normalized
      };
      
    } catch (error) {
      console.error("[PartidoAPI.listByUser] Error:", error);
      
      // Si es 500, devolver array vacío en lugar de fallar
      if (error instanceof Error && error.message.includes('500')) {
        console.warn("[PartidoAPI.listByUser] Error 500, devolviendo array vacío");
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
   * Actualizar partido
   */
  actualizar: async (id: string, cambios: Partial<PartidoDTO>) => {
    console.log("[PartidoAPI.actualizar] ID:", id, "Cambios:", cambios);
    
    const response = await apiFetch<any>(`/api/partidos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cambios)
    });

    console.log("[PartidoAPI.actualizar] Respuesta:", response);

    return {
      ...response,
      data: normalizePartido(response.data)
    };
  },

  /**
   * Cancelar partido
   */
  cancelar: (id: string, motivo?: string) => {
    console.log("[PartidoAPI.cancelar] ID:", id, "Motivo:", motivo);
    
    return apiFetch<void>(`/api/partidos/${id}/cancelar`, {
      method: 'POST',
      body: motivo ? JSON.stringify({ motivo }) : undefined
    });
  },

  /**
   * Completar partido
   */
  completar: (id: string) => {
    console.log("[PartidoAPI.completar] ID:", id);
    
    return apiFetch<void>(`/api/partidos/${id}/completar`, {
      method: 'POST'
    });
  },

  /**
   * Obtener jugadores de un partido
   */
  getJugadores: async (id: string) => {
    console.log("[PartidoAPI.getJugadores] ID:", id);
    
    const response = await apiFetch<UsuarioMinDTO[]>(`/api/partidos/${id}/jugadores`);
    
    console.log("[PartidoAPI.getJugadores] Respuesta:", response);
    
    return response;
  },

  /**
   * Remover jugador de un partido
   */
  removerJugador: (partidoId: string, jugadorId: string) => {
    console.log("[PartidoAPI.removerJugador] Partido:", partidoId, "Jugador:", jugadorId);
    
    return apiFetch<void>(`/api/partidos/${partidoId}/jugadores/${jugadorId}`, {
      method: 'DELETE'
    });
  },

  /**
   * Eliminar partido
   */
  eliminar: (id: string) => {
    console.log("[PartidoAPI.eliminar] ID:", id);
    
    return apiFetch<void>(`/api/partidos/${id}`, {
      method: 'DELETE'
    });
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
    const response = await apiFetch<InscripcionDTO[]>(
      `/api/partidos/${partidoId}/solicitudes`
    );

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
}): Omit<PartidoDTO, 'id' | 'createdAt' | 'jugadoresActuales' | 'precioPorJugador'> {
  // Asegurar formato de hora correcto (HH:mm:ss)
  let horaFormateada = formData.time;
  if (!horaFormateada.includes(':')) {
    horaFormateada = `${horaFormateada}:00:00`;
  } else if (horaFormateada.split(':').length === 2) {
    horaFormateada = `${horaFormateada}:00`;
  }

  return {
    tipoPartido: formData.type as TipoPartido,
    genero: formData.gender,
    nivel: NivelPartido.INTERMEDIO,
    fecha: formData.date,
    hora: horaFormateada,
    duracionMinutos: formData.duration,
    nombreUbicacion: formData.location,
    direccionUbicacion: formData.location,
    latitud: formData.locationCoordinates?.lat,
    longitud: formData.locationCoordinates?.lng,
    cantidadJugadores: formData.totalPlayers,
    precioTotal: formData.totalPrice,
    descripcion: formData.description || undefined,
    estado: PartidoEstado.PENDIENTE,
    organizadorId: formData.organizadorId
  };
}