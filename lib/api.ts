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