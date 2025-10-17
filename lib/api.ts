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
  foto_perfil?: string | null; 
  ubicacion?: string | null; 
  cedula?: string | null; 
  created_at?: string; 
  perfilCompleto?: boolean; 
  cedulaVerificada?: boolean; 
}

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
    throw new Error(`Error en API: ${res.status} ${text}`);
  }

  return res.json() as Promise<ApiResponse<T>>;
}

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

    // El backend ahora devuelve { token, user } en data
    const token = json.data?.token;
    const user = json.data?.user;
    
    console.log("[UsuarioAPI.login] Respuesta del servidor:", {
      success: json.success,
      hasToken: !!token,
      hasUser: !!user,
      userEmail: user?.email,
      perfilCompleto: user?.perfilCompleto,
      cedulaVerificada: user?.cedulaVerificada,
    });
    
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
// INTERFACES PARA PARTIDOS
// ========================================

export interface PartidoDTO {
  id?: string;
  tipoPartido: string;
  genero?: string;
  fecha: string; // yyyy-MM-dd
  hora: string; // HH:mm:ss
  duracionMinutos?: number;
  nombreUbicacion: string;
  direccionUbicacion?: string;
  latitud?: number;
  longitud?: number;
  cantidadJugadores: number;
  jugadoresActuales?: number;
  precioTotal: number;
  precioPorJugador?: number;
  descripcion?: string;
  organizadorId?: string;
  organizadorNombre?: string;
  estado?: string;
  createdAt?: string;
  jugadores?: UsuarioMinDTO[];
}

export interface UsuarioMinDTO {
  id: string;
  nombre: string;
  apellido: string;
  foto_perfil?: string;
  posicion?: string;
  rating?: number;
}

export interface InscripcionDTO {
  id: string;
  partidoId: string;
  usuarioId: string;
  estado: string;
  createdAt?: string;
  usuario?: UsuarioMinDTO;
}

export interface MensajeDTO {
  id?: string;
  contenido: string;
  usuarioId: string;
  partidoId?: string;
  createdAt?: string;
  usuario?: UsuarioMinDTO;
}

// ========================================
// API DE PARTIDOS
// ========================================

export const PartidoAPI = {
  crear: (partido: PartidoDTO) => 
    apiFetch<PartidoDTO>('/api/partidos', {
      method: 'POST',
      body: JSON.stringify(partido)
    }),

  obtener: (id: string) => 
    apiFetch<PartidoDTO>(`/api/partidos/${id}`),

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
    return apiFetch<PartidoDTO[]>(url);
  },

  listarPorUsuario: (usuarioId: string) => 
    apiFetch<PartidoDTO[]>(`/api/partidos/usuario/${usuarioId}`),

  actualizar: (id: string, partido: Partial<PartidoDTO>) => 
    apiFetch<PartidoDTO>(`/api/partidos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(partido)
    }),

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
// HELPERS PARA MAPEAR DATOS
// ========================================

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
    hora: formData.time.includes(':') ? formData.time + ':00' : formData.time,
    duracionMinutos: formData.duration,
    nombreUbicacion: formData.location,
    direccionUbicacion: formData.location,
    latitud: formData.locationCoordinates?.lat ?? null,
    longitud: formData.locationCoordinates?.lng ?? null,
    cantidadJugadores: formData.totalPlayers,
    precioTotal: formData.totalPrice,
    precioPorJugador: formData.totalPlayers > 0 ? formData.totalPrice / formData.totalPlayers : 0,
    descripcion: formData.description || null,
    organizadorId: formData.organizadorId
  };
}