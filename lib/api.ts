import { AuthService } from "./auth";

/**
 * RAW bound (puede ser '/api' o 'http://backend:8080' en tu .env)
 */
const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

/**
 * IMPORTANTE:
 * - Si estamos en el navegador, forzamos rutas relativas '/api' para que el browser
 *   nunca intente resolver nombres de contenedor (ej. backend).
 * - Si estamos en Node (Next.js server dentro del contenedor), permitimos que la URL
 *   absoluta funcione (útil para SSR o proxy desde Next).
 */
export const API_BASE = (typeof window !== 'undefined' && RAW_API_BASE.startsWith('http'))
  ? '/api'
  : RAW_API_BASE;

export const normalizeUrl = (u: string) => u.replace(/([^:]\/)\/+/g, '$1');

console.info('[lib/api] RAW_NEXT_PUBLIC_API_URL =', RAW_API_BASE);
console.info('[lib/api] EFFECTIVE API_BASE =', API_BASE);


export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PendingReviewFromAPI {
  partido_id: string
  tipo_partido: string
  fecha: string
  nombre_ubicacion: string
  jugadores_pendientes: UsuarioMin[]
}

export interface UsuarioMin {
  id: string
  nombre: string
  apellido: string
  foto_perfil?: string
}

/* =========================== ENTIDADES =========================== */
export interface Usuario { /* ...igual que antes... */ id: string; nombre: string; apellido: string; email: string; password?: string | null; celular?: string | null; edad?: number | null; altura?: number | null; peso?: number | null; posicion?: 'Arquero' | 'Zaguero' | 'Lateral' | 'Mediocampista' | 'Volante' | 'Delantero'; foto_perfil?: string | null; ubicacion?: string | null; cedula?: string | null; created_at?: string; perfilCompleto?: boolean; cedulaVerificada?: boolean; }

export interface Partido { id: string; tipo_partido: any; genero: any; fecha: string; hora: string; duracion: number; nombre_ubicacion: string; direccion_ubicacion: string; latitud: number | null; longitud: number | null; cantidad_jugadores: number; precio_total: number; descripcion: string; jugadores_actuales?: number; estado: any; organizador_id: string; created_at: string; }
export interface Inscripcion { id: string; partido_id: string; usuario_id: string; estado: 'PENDIENTE' | 'CONFIRMADO' | 'RECHAZADO'; created_at: string; }
export interface Review { id: string; partido_id: string; usuario_que_califica_id: string; usuario_calificado_id: string; nivel: number; deportividad: number; companerismo: number; comentario?: string | null; created_at: string; }
export interface VerificarCedulaResponse { verified: boolean }

/* =========================== apiFetch =========================== */
async function apiFetch<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const token = AuthService.getToken();
  const fullUrl = `${API_BASE}${url}`;
  console.info('[apiFetch] Request =>', options?.method ?? 'GET', fullUrl, options);

  let res: Response;
  try {
    res = await fetch(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      ...options,
    });
  } catch (networkErr) {
    console.error('[apiFetch] Network error fetching', fullUrl, networkErr);
    throw networkErr;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[apiFetch] HTTP error', res.status, fullUrl, text);
    throw new Error(`Error en API: ${res.status} ${text}`);
  }

  try {
    return await res.json() as ApiResponse<T>;
  } catch (err) {
    console.error('[apiFetch] JSON parse error for', fullUrl, err);
    throw err;
  }
}

/* =========================== USUARIO API =========================== */
export const UsuarioAPI = {
  listar: () => apiFetch<Usuario[]>('/usuarios'),
  obtener: (id: string) => apiFetch<Usuario>(`/usuarios/${id}`),

  crear: async (usuario: Partial<Usuario>) => {
    console.info('[UsuarioAPI.crear] intentando /usuarios', usuario);
    return apiFetch<Usuario>('/usuarios', { method: 'POST', body: JSON.stringify(usuario) });
  },

  verificarCedula: (cedula: string) =>
    apiFetch<VerificarCedulaResponse>('/usuarios/verificar-cedula', { method: 'POST', body: JSON.stringify({ cedula }) }),

  getPendingReviews: (userId: string) =>
    apiFetch<PendingReviewFromAPI[]>(`/usuarios/${userId}/pending-reviews`),

  subirFoto: async (userId: string, file: File): Promise<ApiResponse<{ url: string }>> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/usuarios/${userId}/foto`, { method: "POST", body: formData });
    if (!res.ok) throw new Error(`Error al subir foto: ${res.status}`);
    return res.json();
  },

  login: async (email: string, password: string) => {
    const endpoints = ['/auth/login', '/login'];
    let lastErr: any = null;

    for (const ep of endpoints) {
      const url = `${API_BASE}${ep}`;
      console.info('[UsuarioAPI.login] intentando', url);
      try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          lastErr = new Error(`Error login (${res.status}): ${text}`);
          continue;
        }
        return (await res.json()) as { success: boolean; data: { token: string; user: Usuario } };
      } catch (err) {
        lastErr = err;
      }
    }

    throw lastErr ?? new Error("No se pudo conectar al endpoint de login");
  },

  getFriendRequests: (userId: string) => apiFetch<any[]>(`/usuarios/${userId}/friend-requests`),
  getUnreadMessages: (userId: string) => apiFetch<any[]>(`/usuarios/${userId}/messages`),
  getMatchInvitations: (userId: string) => apiFetch<any[]>(`/usuarios/${userId}/match-invitations`),
  getMatchUpdates: (userId: string) => apiFetch<any[]>(`/usuarios/${userId}/match-updates`),
};

/* =========================== PARTIDO / INSCRIPCION / REVIEW =========================== */
export const PartidoAPI = {
  listar: () => apiFetch<Partido[]>('/partidos'),
  obtener: (id: string) => apiFetch<Partido>(`/partidos/${id}`),
  crear: (partido: Partial<Partido>) => apiFetch<Partido>('/partidos', { method: 'POST', body: JSON.stringify(partido) }),
};

export const InscripcionAPI = {
  listar: () => apiFetch<Inscripcion[]>('/inscripciones'),
  crear: (inscripcion: Partial<Inscripcion>) => apiFetch<Inscripcion>('/inscripciones', { method: 'POST', body: JSON.stringify(inscripcion) }),
};

export const ReviewAPI = {
  listar: () => apiFetch<Review[]>('/reviews'),
  crear: (review: Partial<Review>) => apiFetch<Review>('/reviews', { method: 'POST', body: JSON.stringify(review) }),
  getPendingReviews: (userId: string) => apiFetch<PendingReviewFromAPI[]>(`/usuarios/${userId}/pending-reviews`),
};