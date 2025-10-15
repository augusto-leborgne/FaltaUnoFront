import { AuthService } from "./auth";

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://backend:8080';

// Si estamos en el server (SSR), usamos directamente el hostname del contenedor backend.
// Si estamos en el navegador, usamos '/api' que se proxyea mediante next.config.js
export const API_BASE =
  typeof window === 'undefined'
    ? RAW_API_BASE
    : '/api';

export const normalizeUrl = (u: string) => u.replace(/([^:]\/)\/+/g, '$1');

console.info('[lib/api] RAW_NEXT_PUBLIC_API_URL =', RAW_API_BASE);
console.info('[lib/api] EFFECTIVE API_BASE =', API_BASE);

export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface Usuario { 
  id: string; 
  nombre?: string | null; 
  apellido?: string | null; 
  email?: string | null; 
  password?: string | null; 
  celular?: string | null; 
  edad?: number | null; 
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
  const token = AuthService.getToken();
  const fullUrl = normalizeUrl(`${API_BASE}${url}`);
  console.info('[apiFetch] Request =>', options?.method ?? 'GET', fullUrl, options);

  const headers: Record<string,string> = {
    ...(options && (options as any).headers ? (options as any).headers : { 'Content-Type': 'application/json' }),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  }

  const res = await fetch(fullUrl, {
    credentials: 'include', // cookies de sesión para Spring Security
    headers,
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(()=> '')
    console.error('[apiFetch] HTTP error', res.status, fullUrl, text);
    throw new Error(`Error en API: ${res.status} ${text}`);
  }

  return res.json() as Promise<ApiResponse<T>>;
}

export const UsuarioAPI = {
  listar: () => apiFetch<Usuario[]>('/usuarios'),
  obtener: (id: string) => apiFetch<Usuario>(`/usuarios/${id}`),
  getMe: () => apiFetch<Usuario>('/usuarios/me'),

  crear: async (usuario: Partial<Usuario>) => {
    console.info('[UsuarioAPI.crear] POST /usuarios', usuario);
    return apiFetch<Usuario>('/usuarios', { method: 'POST', body: JSON.stringify(usuario) });
  },

  verificarCedula: async (cedula: string) => {
    const url = normalizeUrl(`${API_BASE}/usuarios/me/verify-cedula`);
    const token = AuthService.getToken();
    const localUser = AuthService.getUser();

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (localUser?.id) headers['X-USER-ID'] = localUser.id;

    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({ cedula })
    });

    const text = await res.text().catch(() => '');
    let json: any = {};
    try { json = text ? JSON.parse(text) : {}; } catch { json = {}; }

    return {
      success: json.success ?? false,
      message: json.message ?? '',
      data: {
        verified: json.data?.verified ?? false,
        user: json.data?.user ?? undefined
      }
    } as ApiResponse<{ verified: boolean; user?: Usuario }>;
  },

  subirFoto: async (file: File, userIdOrMe: string = "me") => {
    const formData = new FormData();
    formData.append("file", file);

    const url = normalizeUrl(`${API_BASE}/usuarios/${userIdOrMe}/foto`);
    const token = AuthService.getToken();
    const localUser = AuthService.getUser();

    const headers: Record<string,string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (localUser && (localUser as any).id) headers['X-USER-ID'] = (localUser as any).id;

    const res = await fetch(url, {
      method: "POST",
      body: formData,
      credentials: "include",
      headers
    });

    if (!res.ok) {
      const txt = await res.text().catch(()=>'');
      throw new Error(`Error al subir foto: ${res.status} ${txt}`);
    }

    try { return await res.json(); } catch { return { success: true }; }
  },

  actualizarPerfil: async (perfil: any) => {
    const res = await fetch(normalizeUrl(`${API_BASE}/usuarios/me`), {
      method: "PUT",
      body: JSON.stringify(perfil),
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    })
    if (!res.ok) {
      const t = await res.text().catch(()=> '')
      throw new Error(`Error al actualizar perfil: ${res.status} ${t}`)
    }
    return res.json()
  },

  login: async (email: string, password: string) => {
    const url = normalizeUrl(`${API_BASE}/auth/login-json`);
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include', // IMPORTANTE para cookies de sesión
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const text = await res.text().catch(()=> '');
    let json: any = {};
    try { json = text ? JSON.parse(text) : {}; } catch(e){ json = {} }

    if (!res.ok) {
      return { success: false, data: {} as any, message: json.message ?? `Error login (${res.status})` };
    }

    const token = json.data?.token;
    const user = json.data?.user;

    // 🔹 guardar token y user local
    if (token) AuthService.setToken(token);
    if (user) AuthService.setUser(user);

    return { success: true, data: { token, user }, message: json.message ?? 'Autenticado' };
  },

  getFriendRequests: (userId: string) => apiFetch<any[]>(`/usuarios/${userId}/friend-requests`),
  getUnreadMessages: (userId: string) => apiFetch<any[]>(`/usuarios/${userId}/messages`),
  getMatchInvitations: (userId: string) => apiFetch<any[]>(`/usuarios/${userId}/match-invitations`),
  getMatchUpdates: (userId: string) => apiFetch<any[]>(`/usuarios/${userId}/match-updates`),
}