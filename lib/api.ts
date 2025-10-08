// lib/api.ts
import { AuthService } from "./auth";

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

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

export interface Usuario { id: string; nombre?: string | null; apellido?: string | null; email?: string | null; password?: string | null; celular?: string | null; edad?: number | null; altura?: number | null; peso?: number | null; posicion?: string | null; foto_perfil?: string | null; ubicacion?: string | null; cedula?: string | null; created_at?: string; perfilCompleto?: boolean; cedulaVerificada?: boolean; }

async function apiFetch<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const token = AuthService.getToken();
  const fullUrl = normalizeUrl(`${API_BASE}${url}`);
  console.info('[apiFetch] Request =>', options?.method ?? 'GET', fullUrl, options);

  const headers: Record<string,string> = {
    ...(options && (options as any).headers ? (options as any).headers : { 'Content-Type': 'application/json' }),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  }

  const res = await fetch(fullUrl, {
    credentials: 'include', // por defecto incluimos credenciales (cookies). Si usas JWT en otro flujo, Authorization también está presente.
    headers,
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(()=>'')
    console.error('[apiFetch] HTTP error', res.status, fullUrl, text);
    throw new Error(`Error en API: ${res.status} ${text}`);
  }

  return res.json() as Promise<ApiResponse<T>>;
}

export const UsuarioAPI = {
  listar: () => apiFetch<Usuario[]>('/usuarios'),
  obtener: (id: string) => apiFetch<Usuario>(`/usuarios/${id}`),

  crear: async (usuario: Partial<Usuario>) => {
    console.info('[UsuarioAPI.crear] POST /usuarios', usuario);
    return apiFetch<Usuario>('/usuarios', { method: 'POST', body: JSON.stringify(usuario) });
  },

  verificarCedula: (cedula: string) =>
    apiFetch<{ verified: boolean }>('/usuarios/verificar-cedula', { method: 'POST', body: JSON.stringify({ cedula }) }),

  subirFoto: async (file: File, userIdOrMe: string = "me") => {
    const formData = new FormData();
    formData.append("file", file);

    const url = normalizeUrl(`${API_BASE}/usuarios/${userIdOrMe}/foto`);
    const token = AuthService.getToken();

    const headers: Record<string,string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
      method: "POST",
      body: formData,
      credentials: "include",
      headers
    });

    if (!res.ok) {
      const txt = await res.text().catch(()=>'')
      throw new Error(`Error al subir foto: ${res.status} ${txt}`);
    }
    return res.json();
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

  login: async (email: string, password: string): Promise<ApiResponse<{ token?: string; user?: Usuario }>> => {
    const endpoints = ['/auth/login', '/login'];
    let lastErr: any = null;

    for (const ep of endpoints) {
      const url = normalizeUrl(`${API_BASE}${ep}`);
      console.info('[UsuarioAPI.login] intentando', url);
      try {
        // Enviar como form-urlencoded para que UsernamePasswordAuthenticationFilter lo lea
        const body = new URLSearchParams();
        body.append('username', email); // Spring usa "username" por defecto
        body.append('password', password);

        const res = await fetch(url, {
          method: 'POST',
          credentials: 'include', // importante para cookie de sesión
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString()
        });

        const text = await res.text().catch(()=>'');

        if (!res.ok) {
          // intentar parsear json si corresponde
          try {
            const json = JSON.parse(text || '{}');
            return { success: false, data: (json.data ?? {}) as any, message: json.message ?? `Error login (${res.status})` };
          } catch {
            return { success: false, data: {} as any, message: `Error login (${res.status}) ${text}` };
          }
        }

        // OK
        const json = text ? JSON.parse(text) : {};
        // Acomodamos a ApiResponse si backend ya devuelve success/data/message OR si usa sesión devolveremos success:true sin token
        const result: ApiResponse<{ token?: string; user?: Usuario }> = {
          success: json.success ?? true,
          data: json.data ?? ({} as any),
          message: json.message
        };
        return result;

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
}