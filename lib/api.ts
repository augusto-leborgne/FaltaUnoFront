// lib/api.ts

import { AuthService } from "./auth"

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '')

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
  jugadores_pendientes: UsuarioMin[] // jugadores que aún debo calificar
}

export interface UsuarioMin {
  id: string
  nombre: string
  apellido: string
  foto_perfil?: string
}

/* ===========================
   ENTIDADES DEL BACK Y DBD
   (Alineadas con tu DB: usar 'celular')
   ========================== */

export interface Usuario {
  id: string
  nombre: string
  apellido: string
  email: string
  password?: string | null
  celular?: string | null          // <-- cambiado de 'telefono' a 'celular'
  edad?: number | null
  altura?: number | null
  peso?: number | null
  posicion?: 'Arquero' | 'Zaguero' | 'Lateral' | 'Mediocampista' | 'Volante' | 'Delantero'
  foto_perfil?: string | null
  ubicacion?: string | null
  cedula?: string | null
  created_at?: string
  perfilCompleto?: boolean
  cedulaVerificada?: boolean
}

/* ===========================
   PARTIDO
   ========================== */

export interface Partido {
  id: string
  tipo_partido: 'F5' | 'F7' | 'F8' | 'F9' | 'F11'
  genero: 'Mixto' | 'Hombres' | 'Mujeres'
  fecha: string
  hora: string
  duracion: number
  nombre_ubicacion: string
  direccion_ubicacion: string
  latitud: number | null
  longitud: number | null
  cantidad_jugadores: number
  precio_total: number
  descripcion: string
  jugadores_actuales?: number
  estado: 'PENDIENTE' | 'CONFIRMADO' | 'CANCELADO' | 'FINALIZADO'
  organizador_id: string
  created_at: string
}

/* ===========================
   INSCRIPCION
   ========================== */

export interface Inscripcion {
  id: string
  partido_id: string
  usuario_id: string
  estado: 'PENDIENTE' | 'CONFIRMADO' | 'RECHAZADO'
  created_at: string
}

/* ===========================
   REVIEW (alineada con DBD)
   campos: nivel, deportividad, companerismo
   ========================== */

export interface Review {
  id: string
  partido_id: string
  usuario_que_califica_id: string
  usuario_calificado_id: string
  nivel: number                  // <-- matches DB: nivel
  deportividad: number          // <-- matches DB: deportividad
  companerismo: number          // <-- matches DB: companerismo
  comentario?: string | null
  created_at: string
}

/* ===========================
   RESPUESTAS ESPECIALES
   ========================== */

export interface VerificarCedulaResponse {
  verified: boolean
}

/* ===========================
   FUNCIONES DE API
   ========================== */

async function apiFetch<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const token = AuthService.getToken()

  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    ...options,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Error en API: ${res.status} ${text}`)
  }

  return res.json()
}

/* ===========================
   USUARIO API
   ========================== */
export const UsuarioAPI = {
  listar: () => apiFetch<Usuario[]>('/api/usuarios'),
  obtener: (id: string) => apiFetch<Usuario>(`/api/usuarios/${id}`),
  crear: (usuario: Partial<Usuario>) =>
    apiFetch<Usuario>('/api/usuarios', { method: 'POST', body: JSON.stringify(usuario) }),
  verificarCedula: (cedula: string) =>
    apiFetch<VerificarCedulaResponse>('/api/usuarios/verificar-cedula', {
      method: 'POST',
      body: JSON.stringify({ cedula }),
    }),
  getPendingReviews: (userId: string) =>
    apiFetch<PendingReviewFromAPI[]>(`/api/usuarios/${userId}/pending-reviews`),
  subirFoto: async (userId: string, file: File): Promise<ApiResponse<{ url: string }>> => {
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch(`${API_BASE}/api/usuarios/${userId}/foto`, {
      method: "POST",
      body: formData
    })
    if (!res.ok) throw new Error(`Error al subir foto: ${res.status}`)
    return res.json()
  },
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    if (!res.ok) throw new Error(`Error al iniciar sesión: ${res.status}`)
    return res.json() as Promise<{ success: boolean; data: { token: string; user: Usuario } }>
  },
  getFriendRequests: (userId: string) =>
    apiFetch<any[]>(`/api/usuarios/${userId}/friend-requests`),
  getUnreadMessages: (userId: string) =>
    apiFetch<any[]>(`/api/usuarios/${userId}/messages`),
  getMatchInvitations: (userId: string) =>
    apiFetch<any[]>(`/api/usuarios/${userId}/match-invitations`),
   getMatchUpdates: (userId: string) =>
    apiFetch<any[]>(`/api/usuarios/${userId}/match-updates`),
}

/* ===========================
   PARTIDO API
   ========================== */
export const PartidoAPI = {
  listar: () => apiFetch<Partido[]>('/api/partidos'),
  obtener: (id: string) => apiFetch<Partido>(`/api/partidos/${id}`),
  crear: (partido: Partial<Partido>) =>
    apiFetch<Partido>('/api/partidos', { method: 'POST', body: JSON.stringify(partido) }),
}

/* ===========================
   INSCRIPCION API
   ========================== */
export const InscripcionAPI = {
  listar: () => apiFetch<Inscripcion[]>('/api/inscripciones'),
  crear: (inscripcion: Partial<Inscripcion>) =>
    apiFetch<Inscripcion>('/api/inscripciones', { method: 'POST', body: JSON.stringify(inscripcion) }),
}

/* ===========================
   REVIEW API
   ========================== */
export const ReviewAPI = {
  listar: () => apiFetch<Review[]>('/api/reviews'),
  crear: (review: Partial<Review>) =>
    apiFetch<Review>('/api/reviews', { method: 'POST', body: JSON.stringify(review) }),
  getPendingReviews: (userId: string) =>
    apiFetch<PendingReviewFromAPI[]>(`/api/usuarios/${userId}/pending-reviews`),
}