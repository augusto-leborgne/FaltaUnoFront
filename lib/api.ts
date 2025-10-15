import { AuthService } from "./auth";

// IMPORTANTE: En el navegador SIEMPRE usamos rutas relativas que Next.js proxea
// En SSR (servidor), podemos usar la URL directa del backend
const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://backend:8080';

// En el navegador usamos rutas relativas que Next.js proxea
// En SSR (servidor), usamos la URL del contenedor Docker
export const API_BASE = typeof window === 'undefined' ? RAW_API_BASE : '';

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

  const headers = new Headers(options?.headers || {});
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);


  const res = await fetch(fullUrl, {
    credentials: 'include',
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
  listar: () => apiFetch<Usuario[]>('/api/usuarios'),
  obtener: (id: string) => apiFetch<Usuario>(`/api/usuarios/${id}`),
  getMe: () => apiFetch<Usuario>('/api/usuarios/me'),

  crear: async (usuario: Partial<Usuario>) => {
    console.info('[UsuarioAPI.crear] POST /api/usuarios', usuario);
    return apiFetch<Usuario>('/api/usuarios', { method: 'POST', body: JSON.stringify(usuario) });
  },

  verificarCedula: async (cedula: string) => {
    const url = normalizeUrl(`${API_BASE}/api/usuarios/me/verify-cedula`);
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

    const url = normalizeUrl(`${API_BASE}/api/usuarios/${userIdOrMe}/foto`);
    const token = AuthService.getToken();
    const localUser = AuthService.getUser();

    // Headers: solo Authorization si hay token
    const headers: Record<string,string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (localUser?.id) headers['X-USER-ID'] = localUser.id;

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

    // Retornar JSON si hay, o fallback a success=true
    try { 
      return await res.json(); 
    } catch { 
      return { success: true }; 
    }
  },

  actualizarPerfil: async (perfil: any) => {
    const token = AuthService.getToken();
    const headers: Record<string,string> = { "Content-Type": "application/json" };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(normalizeUrl(`${API_BASE}/api/usuarios/me`), {
      method: "PUT",
      body: JSON.stringify(perfil),
      headers,
      credentials: "include"
    });

    if (!res.ok) {
      const t = await res.text().catch(()=> '')
      throw new Error(`Error al actualizar perfil: ${res.status} ${t}`)
    }
    return res.json()
  },

  login: async (email: string, password: string) => {
    // CORREGIDO: usa /api/auth/login-json que será proxeado a /auth/login-json
    const url = normalizeUrl(`${API_BASE}/api/auth/login-json`);
    console.log('[UsuarioAPI.login] URL completa:', url);
    
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const text = await res.text().catch(()=> '');
    console.log('[UsuarioAPI.login] Response status:', res.status);
    console.log('[UsuarioAPI.login] Response text:', text);
    
    let json: any = {};
    try { json = text ? JSON.parse(text) : {}; } catch(e){ 
      console.error('[UsuarioAPI.login] Error parseando JSON:', e);
      json = {} 
    }

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
}