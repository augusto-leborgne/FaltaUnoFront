// lib/api.ts
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
  captain: {
    id: string;
    name: string;
    rating: number;
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

  // auth
  async login(email: string, password: string) {
    // useCredentials=true to accept cookies if backend sets session cookie
    const res = await this.request<{ token?: string; user?: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, true);
    // if backend returns token, save it (JWT flow)
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

  // user
  async getProfile(useCredentials = true) {
    return this.request<User>('/users/profile', {}, useCredentials);
  }

  async updateProfile(userData: Partial<User>, useCredentials = true) {
    return this.request<User>('/users/profile', { method: 'PUT', body: JSON.stringify(userData) }, useCredentials);
  }

  // matches
  async getMatches(filters?: Record<string, any>) {
    const qs = filters ? '?' + new URLSearchParams(filters as any).toString() : '';
    return this.request<Match[]>(`/matches${qs}`);
  }

  async getMatch(id: string) {
    return this.request<Match>(`/matches/${id}`);
  }

  // matchData: estructura que tu backend espera
  async createMatch(matchData: Omit<Match, 'id' | 'currentPlayers' | 'players' | 'status'>, useCredentials = true) {
    return this.request<Match>('/matches', { method: 'POST', body: JSON.stringify(matchData) }, useCredentials);
  }

  async joinMatch(matchId: string, useCredentials = true) {
    return this.request<{ success: boolean }>(`/matches/${matchId}/join`, { method: 'POST' }, useCredentials);
  }

  async leaveMatch(matchId: string, useCredentials = true) {
    return this.request<{ success: boolean }>(`/matches/${matchId}/leave`, { method: 'POST' }, useCredentials);
  }

  // user matches (example, can be real API)
  async getUserMatches(useCredentials = true) {
    return this.request<Match[]>('/users/me/matches', {}, useCredentials);
  }

  // reviews
  async submitReview(reviewData: Omit<Review, 'id' | 'createdAt'>, useCredentials = true) {
    return this.request<Review>('/reviews', { method: 'POST', body: JSON.stringify(reviewData) }, useCredentials);
  }

  async getPendingReviews(useCredentials = true) {
    return this.request<Match[]>('/reviews/pending', {}, useCredentials);
  }
}

export const apiService = new ApiService();
