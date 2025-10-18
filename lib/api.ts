import { AuthService } from "./auth";

// API base URL
const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
export const API_BASE = typeof window === 'undefined' ? RAW_API_BASE : '';
export const normalizeUrl = (u: string) => u.replace(/([^:]\/)\/+/g, '$1');

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

// ========================================
// INTERFACES DE USUARIO
// ========================================

export interface Usuario { 
  id: string; 
  nombre?: string | null; 
  apellido?: string | null; 
  email?: string | null; 
  password?: string | null; 
  celular?: string | null; 
  fechaNacimiento?: string | null; // formato: yyyy-MM-dd
  altura?: number | null; 
  peso?: number | null; 
  posicion?: string | null; 
  foto_perfil?: string | null; // Base64
  ubicacion?: string | null; 
  cedula?: string | null; 
  created_at?: string; 
  perfilCompleto?: boolean; 
  cedulaVerificada?: boolean; 
  provider?: string | null;
}

export interface UsuarioMinDTO {
  id: string;
  nombre: string;
  apellido: string;
  foto_perfil?: string;
  posicion?: string;
  rating?: number;
}

// ========================================
// INTERFACES DE PARTIDOS
// ========================================

export interface PartidoDTO {
  id?: string;
  tipoPartido: string; // "FUTBOL_5", "FUTBOL_7", etc.
  genero?: string; // "Mixto", "Hombres", "Mujeres"
  fecha: string; // yyyy-MM-dd
  hora: string; // HH:mm:ss
  duracionMinutos?: number;
  nombreUbicacion: string;
  direccionUbicacion?: string;
  latitud?: number | null;
  longitud?: number | null;
  cantidadJugadores: number;
  jugadoresActuales?: number;
  precioTotal: number;
  precioPorJugador?: number;
  descripcion?: string;
  organizadorId?: string;
  organizadorNombre?: string;
  organizador?: UsuarioMinDTO;
  estado?: string; // "PENDIENTE", "CONFIRMADO", "CANCELADO", "COMPLETADO"
  createdAt?: string;
  jugadores?: UsuarioMinDTO[];
  solicitudes_pendientes?: InscripcionDTO[];
  // Aliases para compatibilidad con frontend
  tipo_partido?: string;
  nivel?: string;
  nombre_ubicacion?: string;
  direccion_ubicacion?: string;
  cantidad_jugadores?: number;
  jugadores_actuales?: number;
  precio_total?: number;
  precio_por_jugador?: number;
  nombre?: string;
  apellido?: string;
}

export interface InscripcionDTO {
  id: string;
  partidoId: string;
  usuarioId: string;
  estado: string; // "PENDIENTE", "ACEPTADO", "RECHAZADO"
  createdAt?: string;
  fecha_solicitud?: string;
  usuario?: UsuarioMinDTO;
  usuario_id?: string;
}

export interface MensajeDTO {
  id?: string;
  contenido: string;
  usuarioId?: string;
  partidoId?: string;
  createdAt?: string;
  usuario?: UsuarioMinDTO;
  usuario_id?: string;
}

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

// ========================================
// FUNCIÓN HELPER PARA API FETCH
// ========================================

async function apiFetch<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  // Validar token antes de hacer request
  AuthService.validateAndCleanup();
  
  const token = AuthService.getToken();
  const fullUrl = normalizeUrl(`${API_BASE}${url}`);

  const headers = new Headers(options?.headers || {});
  if (!headers.has('Content-Type') && !(options?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(fullUrl, {
    headers,
    ...options,
  });

  // Si responde 401, limpiar auth y redirigir
  if (res.status === 401) {
    AuthService.logout();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Sesión expirada');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let errorMessage = `Error en API: ${res.status}`;
    try {
      const errorJson = JSON.parse(text);
      errorMessage = errorJson.message || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }

  return res.json() as Promise<ApiResponse<T>>;
}

// ========================================
// API DE USUARIOS
// ========================================

export const UsuarioAPI = {
  listar: () => apiFetch<Usuario[]>('/api/usuarios'),
  obtener: (id: string) => apiFetch<Usuario>(`/api/usuarios/${id}`),
  getMe: () => apiFetch<Usuario>('/api/usuarios/me'),

  crear: async (usuario: Partial<Usuario>) => {
    const payload: any = { ...usuario };
    // Eliminar foto_perfil si existe (se sube después)
    if ('foto_perfil' in payload) delete payload.foto_perfil;
    if (payload.foto_perfil === '' || payload.foto_perfil === null) delete payload.foto_perfil;

    return apiFetch<Usuario>('/api/usuarios', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  verificarCedula: async (cedula: string) => {
    const token = AuthService.getToken();
    if (!token) throw new Error('No autenticado');

    const res = await fetch(normalizeUrl(`${API_BASE}/api/usuarios/me/verify-cedula`), {
      method: 'POST',
      body: JSON.stringify({ cedula }),
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const text = await res.text().catch(() => '');
    let json: any = {};
    try { json = text ? JSON.parse(text) : {}; } catch {}

    return {
      success: json.success ?? false,
      message: json.message ?? '',
      data: {
        verified: json.data?.verified ?? false,
        user: json.data?.user ?? undefined
      }
    } as ApiResponse<{ verified: boolean; user?: Usuario }>;
  },

  subirFoto: async (file: File): Promise<ApiResponse<{ success: boolean }>> => {
    const formData = new FormData();
    formData.append("file", file);

    const token = AuthService.getToken();
    if (!token) throw new Error('No autenticado');

    const headers: Record<string,string> = {
      'Authorization': `Bearer ${token}`
    };

    const res = await fetch(normalizeUrl(`${API_BASE}/api/usuarios/me/foto`), {
      method: 'POST',
      body: formData,
      headers,
    });

    const text = await res.text().catch(() => '');
    let json: any = {};
    try { json = text ? JSON.parse(text) : {}; } catch {}

    return {
      success: res.ok,
      message: json.message ?? (res.ok ? 'Foto subida correctamente' : `Error: ${res.status}`),
      data: { success: res.ok }
    };
  },

  actualizarPerfil: async (perfil: any) => {
    const token = AuthService.getToken();
    if (!token) throw new Error('No autenticado');

    const headers: Record<string,string> = { 
      "Content-Type": "application/json",
      'Authorization': `Bearer ${token}`
    };

    const res = await fetch(normalizeUrl(`${API_BASE}/api/usuarios/me`), {
      method: "PUT",
      body: JSON.stringify(perfil),
      headers,
    });

    if (!res.ok) {
      const t = await res.text().catch(()=> '');
      throw new Error(`Error al actualizar perfil: ${res.status} ${t}`);
    }
    return res.json();
  },

  login: async (email: string, password: string) => {
    const res = await fetch(normalizeUrl(`${API_BASE}/api/auth/login-json`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const text = await res.text().catch(()=> '');
    let json: any = {};
    try { json = text ? JSON.parse(text) : {}; } catch {}

    if (!res.ok) {
      return { 
        success: false, 
        data: {} as any, 
        message: json.message ?? `Error login (${res.status})` 
      };
    }

    const token = json.data?.token;
    const user = json.data?.user;
    
    if (token) AuthService.setToken(token);
    if (user) AuthService.setUser(user);

    return { 
      success: true, 
      data: { token, user }, 
      message: json.message ?? 'Autenticado' 
    };
  },

  getFriendRequests: (userId: string) => apiFetch<any[]>(`/api/usuarios/${userId}/friend-requests`),
  getUnreadMessages: (userId: string) => apiFetch<any[]>(`/api/usuarios/${userId}/messages`),
  getMatchInvitations: (userId: string) => apiFetch<any[]>(`/api/usuarios/${userId}/match-invitations`),
  getMatchUpdates: (userId: string) => apiFetch<any[]>(`/api/usuarios/${userId}/match-updates`),
};

// ========================================
// API DE PARTIDOS
// ========================================

export const PartidoAPI = {
  crear: (partido: PartidoDTO) => {
    // Mapear campos del frontend al formato del backend
    const backendPartido = {
      tipoPartido: partido.tipoPartido || partido.tipo_partido,
      genero: partido.genero,
      fecha: partido.fecha,
      hora: partido.hora,
      duracionMinutos: partido.duracionMinutos || partido.duracionMinutos || 90,
      nombreUbicacion: partido.nombreUbicacion || partido.nombre_ubicacion,
      direccionUbicacion: partido.direccionUbicacion || partido.direccion_ubicacion,
      latitud: partido.latitud,
      longitud: partido.longitud,
      cantidadJugadores: partido.cantidadJugadores || partido.cantidad_jugadores,
      precioTotal: partido.precioTotal || partido.precio_total || 0,
      descripcion: partido.descripcion,
      organizadorId: partido.organizadorId
    };
    
    return apiFetch<PartidoDTO>('/api/partidos', {
      method: 'POST',
      body: JSON.stringify(backendPartido)
    }).then(response => ({
      ...response,
      data: response.data ? normalizePartidoDTO(response.data) : response.data
    }));
  },

  obtener: (id: string) => 
    apiFetch<PartidoDTO>(`/api/partidos/${id}`)
      .then(response => ({
        ...response,
        data: response.data ? normalizePartidoDTO(response.data) : response.data
      })),

  listar: (params?: {
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
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    const url = query ? `/api/partidos?${query}` : '/api/partidos';
    return apiFetch<PartidoDTO[]>(url)
      .then(response => ({
        ...response,
        data: response.data ? response.data.map(normalizePartidoDTO) : response.data
      }));
  },

  listarPorUsuario: (usuarioId: string) => 
    apiFetch<PartidoDTO[]>(`/api/partidos/usuario/${usuarioId}`)
      .then(response => ({
        ...response,
        data: response.data ? response.data.map(normalizePartidoDTO) : response.data
      })),

  actualizar: (id: string, partido: Partial<PartidoDTO>) => {
    // Mapear campos al formato del backend
    const backendPartido: any = {};
    if (partido.fecha) backendPartido.fecha = partido.fecha;
    if (partido.hora) backendPartido.hora = partido.hora;
    if (partido.nombreUbicacion || partido.nombre_ubicacion) {
      backendPartido.nombreUbicacion = partido.nombreUbicacion || partido.nombre_ubicacion;
    }
    if (partido.direccionUbicacion || partido.direccion_ubicacion) {
      backendPartido.direccionUbicacion = partido.direccionUbicacion || partido.direccion_ubicacion;
    }
    if (partido.latitud !== undefined) backendPartido.latitud = partido.latitud;
    if (partido.longitud !== undefined) backendPartido.longitud = partido.longitud;
    if (partido.cantidadJugadores || partido.cantidad_jugadores) {
      backendPartido.cantidadJugadores = partido.cantidadJugadores || partido.cantidad_jugadores;
    }
    if (partido.precioTotal || partido.precio_total) {
      backendPartido.precioTotal = partido.precioTotal || partido.precio_total;
    }
    if (partido.descripcion !== undefined) backendPartido.descripcion = partido.descripcion;
    if (partido.duracionMinutos || partido.duracionMinutos) {
      backendPartido.duracionMinutos = partido.duracionMinutos || partido.duracionMinutos;
    }
    
    return apiFetch<PartidoDTO>(`/api/partidos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(backendPartido)
    }).then(response => ({
      ...response,
      data: response.data ? normalizePartidoDTO(response.data) : response.data
    }));
  },

  cancelar: (id: string, motivo?: string) => 
    apiFetch<void>(`/api/partidos/${id}/cancelar`, {
      method: 'POST',
      body: motivo ? JSON.stringify({ motivo }) : undefined
    }),

  completar: (id: string) => 
    apiFetch<void>(`/api/partidos/${id}/completar`, {
      method: 'POST'
    }),

  obtenerJugadores: (id: string) => 
    apiFetch<UsuarioMinDTO[]>(`/api/partidos/${id}/jugadores`),

  removerJugador: (partidoId: string, jugadorId: string) => 
    apiFetch<void>(`/api/partidos/${partidoId}/jugadores/${jugadorId}`, {
      method: 'DELETE'
    }),

  eliminar: (id: string) => 
    apiFetch<void>(`/api/partidos/${id}`, {
      method: 'DELETE'
    })
};

// ========================================
// API DE INSCRIPCIONES
// ========================================

export const InscripcionAPI = {
  crear: (partidoId: string, usuarioId: string) => 
    apiFetch<InscripcionDTO>('/api/inscripciones', {
      method: 'POST',
      body: JSON.stringify({ partidoId, usuarioId })
    }),

  listarPorUsuario: (usuarioId: string, estado?: string) => {
    const query = estado ? `?estado=${estado}` : '';
    return apiFetch<InscripcionDTO[]>(`/api/inscripciones/usuario/${usuarioId}${query}`);
  },

  listarPorPartido: (partidoId: string, estado?: string) => {
    const query = estado ? `?estado=${estado}` : '';
    return apiFetch<InscripcionDTO[]>(`/api/inscripciones/partido/${partidoId}${query}`);
  },

  obtenerSolicitudesPendientes: (partidoId: string) => 
    apiFetch<InscripcionDTO[]>(`/api/inscripciones/partido/${partidoId}/pendientes`),

  aceptar: (inscripcionId: string) => 
    apiFetch<InscripcionDTO>(`/api/inscripciones/${inscripcionId}/aceptar`, {
      method: 'POST'
    }),

  rechazar: (inscripcionId: string, motivo?: string) => 
    apiFetch<void>(`/api/inscripciones/${inscripcionId}/rechazar`, {
      method: 'POST',
      body: motivo ? JSON.stringify({ motivo }) : undefined
    }),

  cancelar: (inscripcionId: string) => 
    apiFetch<void>(`/api/inscripciones/${inscripcionId}`, {
      method: 'DELETE'
    }),

  obtenerEstado: (partidoId: string, usuarioId: string) => 
    apiFetch<{
      inscrito: boolean;
      estado: string | null;
      inscripcionId?: string;
    }>(`/api/inscripciones/estado?partidoId=${partidoId}&usuarioId=${usuarioId}`)
};

// ========================================
// API DE MENSAJES (CHAT)
// ========================================

export const MensajeAPI = {
  listarPorPartido: (partidoId: string) => 
    apiFetch<MensajeDTO[]>(`/api/partidos/${partidoId}/mensajes`),

  enviar: (partidoId: string, contenido: string, usuarioId: string) => 
    apiFetch<MensajeDTO>(`/api/partidos/${partidoId}/mensajes`, {
      method: 'POST',
      body: JSON.stringify({ contenido, usuarioId })
    })
};

// ========================================
// API DE REVIEWS
// ========================================

export const ReviewAPI = {
  crear: (review: Omit<ReviewDTO, 'id' | 'createdAt'>) =>
    apiFetch<ReviewDTO>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(review)
    }),

  listarPorUsuario: (usuarioCalificadoId: string) =>
    apiFetch<ReviewDTO[]>(`/api/reviews?usuarioCalificadoId=${usuarioCalificadoId}`),

  listarPorPartido: (partidoId: string) =>
    apiFetch<ReviewDTO[]>(`/api/reviews?partidoId=${partidoId}`)
};

// ========================================
// HELPERS PARA MAPEAR DATOS
// ========================================

/**
 * Normaliza un PartidoDTO del backend al formato esperado por el frontend
 */
export function normalizePartidoDTO(partido: any): PartidoDTO {
  return {
    id: partido.id,
    tipoPartido: partido.tipoPartido || partido.tipo_partido,
    genero: partido.genero,
    fecha: partido.fecha,
    hora: partido.hora,
    duracionMinutos: partido.duracionMinutos || partido.duracion_minutos || 90,
    nombreUbicacion: partido.nombreUbicacion || partido.nombre_ubicacion,
    direccionUbicacion: partido.direccionUbicacion || partido.direccion_ubicacion,
    latitud: partido.latitud,
    longitud: partido.longitud,
    cantidadJugadores: partido.cantidadJugadores || partido.cantidad_jugadores,
    jugadoresActuales: partido.jugadoresActuales || partido.jugadores_actuales || 0,
    precioTotal: partido.precioTotal || partido.precio_total || 0,
    precioPorJugador: partido.precioPorJugador || partido.precio_por_jugador || 
      (partido.cantidadJugadores > 0 ? partido.precioTotal / partido.cantidadJugadores : 0),
    descripcion: partido.descripcion,
    organizadorId: partido.organizadorId || partido.organizador_id,
    organizadorNombre: partido.organizadorNombre || partido.organizador_nombre,
    organizador: partido.organizador,
    estado: partido.estado || 'PENDIENTE',
    createdAt: partido.createdAt || partido.created_at,
    jugadores: partido.jugadores,
    solicitudes_pendientes: partido.solicitudes_pendientes,
    // Aliases para compatibilidad
    tipo_partido: partido.tipoPartido || partido.tipo_partido,
    nombre_ubicacion: partido.nombreUbicacion || partido.nombre_ubicacion,
    direccion_ubicacion: partido.direccionUbicacion || partido.direccion_ubicacion,
    cantidad_jugadores: partido.cantidadJugadores || partido.cantidad_jugadores,
    jugadores_actuales: partido.jugadoresActuales || partido.jugadores_actuales || 0,
    precio_total: partido.precioTotal || partido.precio_total || 0,
    precio_por_jugador: partido.precioPorJugador || partido.precio_por_jugador
  };
}

/**
 * Mapea datos del formulario al formato del backend
 */
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
}): PartidoDTO {
  return {
    tipoPartido: formData.type,
    genero: formData.gender,
    fecha: formData.date,
    hora: formData.time.includes(':') ? formData.time : `${formData.time}:00`,
    duracionMinutos: formData.duration,
    nombreUbicacion: formData.location,
    direccionUbicacion: formData.location,
    latitud: formData.locationCoordinates?.lat ?? null,
    longitud: formData.locationCoordinates?.lng ?? null,
    cantidadJugadores: formData.totalPlayers,
    precioTotal: formData.totalPrice,
    precioPorJugador: formData.totalPlayers > 0 ? formData.totalPrice / formData.totalPlayers : 0,
    descripcion: formData.description || undefined,
    organizadorId: formData.organizadorId
  };
}

  /**
 * Obtener solicitudes con información de usuario
 */
export async function obtenerSolicitudesConUsuario(partidoId: string) {
  const token = AuthService.getToken();
  if (!token) throw new Error('No autenticado');

  const response = await fetch(`/api/partidos/${partidoId}/solicitudes`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Error al obtener solicitudes');
  }

  const result = await response.json();
  return result.data || [];
}