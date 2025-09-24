// src/lib/api.ts
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  birthDate?: string;
  profileImage?: string;
  rating: number;
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  preferences: {
    position: string;
    level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
    notifications: boolean;
  };
}

export interface Match {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  type: "FUTBOL_5" | "FUTBOL_7" | "FUTBOL_8" | "FUTBOL_9" | "FUTBOL_11";
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  price: number;
  maxPlayers: number;
  currentPlayers: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "FINISHED";
  location: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  captain?: {
    id: string;
    name?: string;
    rating?: number;
  };
  players: User[];
}

export interface Review {
  id: string;
  matchId: string;
  reviewerId: string;
  reviewedId: string;
  punctuality: number;
  technique: number;
  attitude: number;
  comment?: string;
  createdAt: string;
}

// serializadores (crea el archivo src/lib/apiSerializers.ts con las funciones matchToApi/matchFromApi)
import { matchToApi, matchFromApi } from './apiSerializers';

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}, useCredentials = false): Promise<ApiResponse<T>> {
    if (!endpoint.startsWith('/')) endpoint = `/${endpoint}`;
    const url = `${API_BASE}${endpoint}`;

    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config: RequestInit = {
      ...options,
      headers,
      credentials: useCredentials ? 'include' : 'same-origin',
    };

    const res = await fetch(url, config);
    const ct = res.headers.get('content-type') || '';
    const body = ct.includes('application/json') ? await res.json().catch(() => null) : await res.text().catch(() => null);

    if (!res.ok) {
      const err: any = new Error(body?.message || res.statusText || `HTTP ${res.status}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }

    if (body && typeof body === 'object' && ('success' in body || 'data' in body)) return body as ApiResponse<T>;
    return { data: body as T, success: true } as ApiResponse<T>;
  }

  // --- Auth ---
  async login(email: string, password: string) {
    const res = await this.request<{ token?: string; user?: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, true);
    if (res.data?.token) {
      localStorage.setItem('authToken', res.data.token);
    }
    if (res.data?.user) {
      localStorage.setItem('currentUser', JSON.stringify(res.data.user));
    }
    return res;
  }

  async register(userData: Partial<User> & { password: string }) {
    return this.request<{ token?: string; user?: User }>('/auth/register', { method: 'POST', body: JSON.stringify(userData) }, false);
  }

  async verifyIdentity(cedula: string) {
    return this.request<{ verified: boolean }>('/auth/verify-identity', { method: 'POST', body: JSON.stringify({ cedula }) }, false);
  }

  // --- User ---
  async getProfile(useCredentials = true) {
    return this.request<User>('/api/usuarios/profile', {}, useCredentials);
  }

  async updateProfile(userData: Partial<User>, useCredentials = true) {
    return this.request<User>('/api/usuarios/profile', { method: 'PUT', body: JSON.stringify(userData) }, useCredentials);
  }

  // --- Matches (adapted to backend Spanish endpoints) ---
  // filters should be plain object of query params expected by backend (snake_case)
  async getMatches(filters?: Record<string, any>) {
    const qs = filters ? '?' + new URLSearchParams(filters as any).toString() : '';
    const res = await this.request<any[]>(`/api/partidos${qs}`);
    // map each backend partido -> frontend Match
    return { ...res, data: (res.data ?? []).map(matchFromApi) } as ApiResponse<Match[]>;
  }

  async getMatch(id: string) {
    const res = await this.request<any>(`/api/partidos/${id}`);
    return { ...res, data: matchFromApi(res.data) } as ApiResponse<Match>;
  }

  // createMatch accepts frontend Match-like shape (without id/currentPlayers/players/status)
  async createMatch(matchData: Omit<Match, 'id' | 'currentPlayers' | 'players' | 'status'>, useCredentials = true) {
    const payload = matchToApi(matchData);
    const res = await this.request<any>('/api/partidos', { method: 'POST', body: JSON.stringify(payload) }, useCredentials);
    return { ...res, data: matchFromApi(res.data) } as ApiResponse<Match>;
  }

  // --- Inscripciones (join/leave) ---
  async joinMatch(matchId: string, useCredentials = true) {
    // backend expects { partido_id, usuario_id }
    const currentUserRaw = typeof window !== 'undefined' ? localStorage.getItem('currentUser') : null;
    const usuario = currentUserRaw ? JSON.parse(currentUserRaw) : null;
    const usuarioId = usuario?.id ?? null;
    if (!usuarioId) throw new Error('Usuario no autenticado');

    const payload = { partido_id: matchId, usuario_id: usuarioId };
    return this.request<{ success: boolean }>('/api/inscripciones', { method: 'POST', body: JSON.stringify(payload) }, useCredentials);
  }

  async leaveMatch(matchId: string, useCredentials = true) {
    const currentUserRaw = typeof window !== 'undefined' ? localStorage.getItem('currentUser') : null;
    const usuario = currentUserRaw ? JSON.parse(currentUserRaw) : null;
    const usuarioId = usuario?.id ?? null;
    if (!usuarioId) throw new Error('Usuario no autenticado');

    // DELETE /api/inscripciones?partido_id=...&usuario_id=...
    const qs = `?partido_id=${encodeURIComponent(matchId)}&usuario_id=${encodeURIComponent(usuarioId)}`;
    return this.request<{ success: boolean }>(`/api/inscripciones${qs}`, { method: 'DELETE' }, useCredentials);
  }

  // matches related to logged user (organizer or player)
  async getUserMatches(useCredentials = true) {
    const res = await this.request<any[]>('/api/usuarios/me/partidos', {}, useCredentials);
    return { ...res, data: (res.data ?? []).map(matchFromApi) } as ApiResponse<Match[]>;
  }

  // --- Reviews ---
  async submitReview(reviewData: Omit<Review, 'id' | 'createdAt'>, useCredentials = true) {
    // Build payload adapted to backend Spanish schema
    const payload: any = {
      partido_id: reviewData.matchId,
      usuario_que_califica_id: reviewData.reviewerId,
      usuario_calificado_id: reviewData.reviewedId,
      nivel: reviewData.punctuality ?? reviewData.nivel ?? reviewData.puntaje_nivel,
      deportividad: reviewData.technique ?? reviewData.deportividad ?? reviewData.puntaje_deportividad,
      companerismo: reviewData.attitude ?? reviewData.companerismo ?? reviewData.puntaje_companerismo,
      comentario: reviewData.comment ?? reviewData.comentario ?? ''
    };

    const res = await this.request<any>('/api/reviews', { method: 'POST', body: JSON.stringify(payload) }, useCredentials);
    return res;
  }

  async getPendingReviews(useCredentials = true) {
    const res = await this.request<any[]>('/api/reviews/pending', {}, useCredentials);
    // backend returns matches; map them to frontend Match
    return { ...res, data: (res.data ?? []).map(matchFromApi) } as ApiResponse<Match[]>;
  }
}

export const apiService = new ApiService();