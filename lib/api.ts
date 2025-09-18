const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"

export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  birthDate?: string
  profileImage?: string
  rating: number
  location: {
    address: string
    latitude: number
    longitude: number
  }
  preferences: {
    position: string
    level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
    notifications: boolean
  }
}

export interface Match {
  id: string
  title: string
  description: string
  date: string
  time: string
  type: "FUTBOL_5" | "FUTBOL_7" | "FUTBOL_8" | "FUTBOL_9" | "FUTBOL_11"
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
  price: number
  maxPlayers: number
  currentPlayers: number
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "FINISHED"
  location: {
    name: string
    address: string
    latitude: number
    longitude: number
  }
  captain: {
    id: string
    name: string
    rating: number
  }
  players: User[]
}

export interface Review {
  id: string
  matchId: string
  reviewerId: string
  reviewedId: string
  punctuality: number
  technique: number
  attitude: number
  comment?: string
  createdAt: string
}

const mockMatches: Match[] = [
  {
    id: "1",
    title: "Partido de Fútbol 5 - Polideportivo Norte",
    description: "Partido rápido en pista cubierta. Trae camiseta oscura y puntualidad.",
    date: "2024-01-15",
    time: "18:30",
    type: "FUTBOL_5",
    level: "INTERMEDIATE",
    price: 8,
    maxPlayers: 10,
    currentPlayers: 9,
    status: "PENDING",
    location: {
      name: "Polideportivo Norte",
      address: "Av. 8 de Octubre 2738, Montevideo",
      latitude: -34.8941,
      longitude: -56.1662,
    },
    captain: {
      id: "cap1",
      name: "Juan Pérez",
      rating: 4.5,
    },
    players: [
      {
        id: "p1",
        email: "juan@example.com",
        firstName: "Juan",
        lastName: "Pérez",
        rating: 4.5,
        location: { address: "", latitude: 0, longitude: 0 },
        preferences: { position: "Arquero", level: "INTERMEDIATE", notifications: true },
      },
      {
        id: "p2",
        email: "maria@example.com",
        firstName: "María",
        lastName: "González",
        rating: 4.2,
        location: { address: "", latitude: 0, longitude: 0 },
        preferences: { position: "Defensa", level: "INTERMEDIATE", notifications: true },
      },
    ],
  },
  {
    id: "2",
    title: "Fútbol 7 - Centro Deportivo Sur",
    description: "Partido competitivo en cancha de césped sintético. Nivel intermedio-avanzado.",
    date: "2024-01-16",
    time: "20:00",
    type: "FUTBOL_7",
    level: "ADVANCED",
    price: 12,
    maxPlayers: 14,
    currentPlayers: 11,
    status: "PENDING",
    location: {
      name: "Centro Deportivo Sur",
      address: "Bvar. Artigas 1234, Montevideo",
      latitude: -34.9211,
      longitude: -56.1545,
    },
    captain: {
      id: "cap2",
      name: "Carlos Rodríguez",
      rating: 4.7,
    },
    players: [
      {
        id: "p3",
        email: "carlos@example.com",
        firstName: "Carlos",
        lastName: "Rodríguez",
        rating: 4.7,
        location: { address: "", latitude: 0, longitude: 0 },
        preferences: { position: "Delantero", level: "ADVANCED", notifications: true },
      },
    ],
  },
  {
    id: "3",
    title: "Fútbol 5 Matutino - Complejo Deportivo Este",
    description: "Partido temprano para los madrugadores. Ambiente relajado y divertido.",
    date: "2024-01-17",
    time: "08:00",
    type: "FUTBOL_5",
    level: "BEGINNER",
    price: 6,
    maxPlayers: 10,
    currentPlayers: 7,
    status: "PENDING",
    location: {
      name: "Complejo Deportivo Este",
      address: "Av. Italia 3456, Montevideo",
      latitude: -34.8811,
      longitude: -56.1345,
    },
    captain: {
      id: "cap3",
      name: "Ana López",
      rating: 4.1,
    },
    players: [
      {
        id: "p4",
        email: "ana@example.com",
        firstName: "Ana",
        lastName: "López",
        rating: 4.1,
        location: { address: "", latitude: 0, longitude: 0 },
        preferences: { position: "Medio", level: "BEGINNER", notifications: true },
      },
    ],
  },
  {
    id: "4",
    title: "Fútbol 11 - Estadio Municipal",
    description: "Partido oficial en cancha reglamentaria. Solo jugadores experimentados.",
    date: "2024-01-18",
    time: "16:00",
    type: "FUTBOL_11",
    level: "ADVANCED",
    price: 15,
    maxPlayers: 22,
    currentPlayers: 18,
    status: "CONFIRMED",
    location: {
      name: "Estadio Municipal",
      address: "Rambla República de México 6451, Montevideo",
      latitude: -34.9111,
      longitude: -56.1745,
    },
    captain: {
      id: "cap4",
      name: "Diego Martínez",
      rating: 4.8,
    },
    players: [
      {
        id: "p5",
        email: "diego@example.com",
        firstName: "Diego",
        lastName: "Martínez",
        rating: 4.8,
        location: { address: "", latitude: 0, longitude: 0 },
        preferences: { position: "Medio", level: "ADVANCED", notifications: true },
      },
    ],
  },
  {
    id: "5",
    title: "Fútbol 7 Nocturno - Cancha Iluminada Norte",
    description: "Partido bajo las luces. Perfecto para después del trabajo.",
    date: "2024-01-19",
    time: "21:30",
    type: "FUTBOL_7",
    level: "INTERMEDIATE",
    price: 10,
    maxPlayers: 14,
    currentPlayers: 8,
    status: "PENDING",
    location: {
      name: "Cancha Iluminada Norte",
      address: "Camino Carrasco 7890, Montevideo",
      latitude: -34.8641,
      longitude: -56.1462,
    },
    captain: {
      id: "cap5",
      name: "Sofía Fernández",
      rating: 4.3,
    },
    players: [
      {
        id: "p6",
        email: "sofia@example.com",
        firstName: "Sofía",
        lastName: "Fernández",
        rating: 4.3,
        location: { address: "", latitude: 0, longitude: 0 },
        preferences: { position: "Defensa", level: "INTERMEDIATE", notifications: true },
      },
    ],
  },
  {
    id: "6",
    title: "Fútbol 5 Express - Cancha Rápida Centro",
    description: "Partido de 60 minutos en el centro de la ciudad. Ideal para el almuerzo.",
    date: "2024-01-20",
    time: "12:30",
    type: "FUTBOL_5",
    level: "INTERMEDIATE",
    price: 7,
    maxPlayers: 10,
    currentPlayers: 10,
    status: "CONFIRMED",
    location: {
      name: "Cancha Rápida Centro",
      address: "18 de Julio 1234, Montevideo",
      latitude: -34.9061,
      longitude: -56.1915,
    },
    captain: {
      id: "cap6",
      name: "Roberto Silva",
      rating: 4.4,
    },
    players: [
      {
        id: "p7",
        email: "roberto@example.com",
        firstName: "Roberto",
        lastName: "Silva",
        rating: 4.4,
        location: { address: "", latitude: 0, longitude: 0 },
        preferences: { position: "Delantero", level: "INTERMEDIATE", notifications: true },
      },
    ],
  },
  {
    id: "7",
    title: "Fútbol 8 Mixto - Polideportivo Oeste",
    description: "Partido mixto para todos los niveles. Ambiente inclusivo y divertido.",
    date: "2024-01-21",
    time: "17:00",
    type: "FUTBOL_8",
    level: "BEGINNER",
    price: 9,
    maxPlayers: 16,
    currentPlayers: 12,
    status: "PENDING",
    location: {
      name: "Polideportivo Oeste",
      address: "Av. Agraciada 2345, Montevideo",
      latitude: -34.8741,
      longitude: -56.2145,
    },
    captain: {
      id: "cap7",
      name: "Lucía Morales",
      rating: 4.0,
    },
    players: [
      {
        id: "p8",
        email: "lucia@example.com",
        firstName: "Lucía",
        lastName: "Morales",
        rating: 4.0,
        location: { address: "", latitude: 0, longitude: 0 },
        preferences: { position: "Medio", level: "BEGINNER", notifications: true },
      },
    ],
  },
  {
    id: "8",
    title: "Fútbol 5 Veteranos - Club Deportivo",
    description: "Para jugadores mayores de 35 años. Ritmo tranquilo pero competitivo.",
    date: "2024-01-22",
    time: "19:00",
    type: "FUTBOL_5",
    level: "INTERMEDIATE",
    price: 8,
    maxPlayers: 10,
    currentPlayers: 6,
    status: "PENDING",
    location: {
      name: "Club Deportivo Veteranos",
      address: "Propios 1567, Montevideo",
      latitude: -34.8941,
      longitude: -56.1762,
    },
    captain: {
      id: "cap8",
      name: "Fernando Castro",
      rating: 4.2,
    },
    players: [
      {
        id: "p9",
        email: "fernando@example.com",
        firstName: "Fernando",
        lastName: "Castro",
        rating: 4.2,
        location: { address: "", latitude: 0, longitude: 0 },
        preferences: { position: "Arquero", level: "INTERMEDIATE", notifications: true },
      },
    ],
  },
]

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`
    const token = localStorage.getItem("authToken")

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "API request failed")
      }

      return data
    } catch (error) {
      console.error("API Error:", error)
      throw error
    }
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: User }>> {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
  }

  async register(userData: Partial<User> & { password: string }): Promise<ApiResponse<{ token: string; user: User }>> {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    })
  }

  async verifyIdentity(cedula: string): Promise<ApiResponse<{ verified: boolean }>> {
    return this.request("/auth/verify-identity", {
      method: "POST",
      body: JSON.stringify({ cedula }),
    })
  }

  // User endpoints
  async getProfile(): Promise<ApiResponse<User>> {
    return this.request("/users/profile")
  }

  async updateProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    return this.request("/users/profile", {
      method: "PUT",
      body: JSON.stringify(userData),
    })
  }

  // Match endpoints
  async getMatches(filters?: {
    type?: string
    level?: string
    date?: string
    location?: string
  }): Promise<ApiResponse<Match[]>> {
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      let filteredMatches = [...mockMatches]

      if (filters) {
        if (filters.type) {
          filteredMatches = filteredMatches.filter((match) => match.type === filters.type)
        }
        if (filters.level) {
          filteredMatches = filteredMatches.filter((match) => match.level === filters.level)
        }
        if (filters.date === "today") {
          const today = new Date().toISOString().split("T")[0]
          filteredMatches = filteredMatches.filter((match) => match.date === today)
        }
        if (filters.location === "nearby") {
          // Mock nearby filter - return first 4 matches
          filteredMatches = filteredMatches.slice(0, 4)
        }
      }

      return {
        data: filteredMatches,
        success: true,
        message: "Matches loaded successfully",
      }
    } catch (error) {
      throw new Error("Failed to load matches")
    }
  }

  async getMatch(id: string): Promise<ApiResponse<Match>> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300))

      const match = mockMatches.find((m) => m.id === id)
      if (!match) {
        throw new Error("Match not found")
      }

      return {
        data: match,
        success: true,
        message: "Match loaded successfully",
      }
    } catch (error) {
      throw new Error("Failed to load match")
    }
  }

  async createMatch(
    matchData: Omit<Match, "id" | "currentPlayers" | "players" | "status">,
  ): Promise<ApiResponse<Match>> {
    return this.request("/matches", {
      method: "POST",
      body: JSON.stringify(matchData),
    })
  }

  async joinMatch(matchId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/matches/${matchId}/join`, {
      method: "POST",
    })
  }

  async leaveMatch(matchId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/matches/${matchId}/leave`, {
      method: "POST",
    })
  }

  async getUserMatches(): Promise<ApiResponse<Match[]>> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Mock user matches - mix of created and joined matches
      const userMatches: Match[] = [
        // Created matches (current user is captain)
        {
          id: "user-created-1",
          title: "Mi Partido de Fútbol 5 - Polideportivo Centro",
          description: "Partido que organicé para esta tarde. Ambiente competitivo pero divertido.",
          date: "2024-01-15",
          time: "18:00",
          type: "FUTBOL_5",
          level: "INTERMEDIATE",
          price: 8,
          maxPlayers: 10,
          currentPlayers: 8,
          status: "CONFIRMED",
          location: {
            name: "Polideportivo Centro",
            address: "18 de Julio 1856, Montevideo",
            latitude: -34.9061,
            longitude: -56.1915,
          },
          captain: {
            id: "current-user-id",
            name: "Mi Usuario",
            rating: 4.3,
          },
          players: [],
        },
        {
          id: "user-created-2",
          title: "Fútbol 7 Fin de Semana - Complejo Norte",
          description: "Partido para el sábado por la mañana. Perfecto para empezar el fin de semana.",
          date: "2024-01-20",
          time: "10:00",
          type: "FUTBOL_7",
          level: "BEGINNER",
          price: 10,
          maxPlayers: 14,
          currentPlayers: 6,
          status: "PENDING",
          location: {
            name: "Complejo Norte",
            address: "Av. 8 de Octubre 3456, Montevideo",
            latitude: -34.8941,
            longitude: -56.1662,
          },
          captain: {
            id: "current-user-id",
            name: "Mi Usuario",
            rating: 4.3,
          },
          players: [],
        },
        {
          id: "user-created-3",
          title: "Fútbol 5 Nocturno - Cancha Iluminada",
          description: "Partido después del trabajo. Trae camiseta clara y ganas de jugar.",
          date: "2024-01-22",
          time: "21:00",
          type: "FUTBOL_5",
          level: "ADVANCED",
          price: 12,
          maxPlayers: 10,
          currentPlayers: 4,
          status: "PENDING",
          location: {
            name: "Cancha Iluminada Sur",
            address: "Bvar. Artigas 2890, Montevideo",
            latitude: -34.9211,
            longitude: -56.1545,
          },
          captain: {
            id: "current-user-id",
            name: "Mi Usuario",
            rating: 4.3,
          },
          players: [],
        },
        // Joined matches (other users are captains)
        {
          id: "user-joined-1",
          title: "Fútbol 5 Matutino - Club Deportivo",
          description: "Partido temprano para empezar bien el día. Nivel intermedio.",
          date: "2024-01-16",
          time: "08:30",
          type: "FUTBOL_5",
          level: "INTERMEDIATE",
          price: 7,
          maxPlayers: 10,
          currentPlayers: 9,
          status: "CONFIRMED",
          location: {
            name: "Club Deportivo Este",
            address: "Av. Italia 4567, Montevideo",
            latitude: -34.8811,
            longitude: -56.1345,
          },
          captain: {
            id: "other-captain-1",
            name: "Martín González",
            rating: 4.6,
          },
          players: [],
        },
        {
          id: "user-joined-2",
          title: "Fútbol 8 Mixto - Polideportivo Oeste",
          description: "Partido mixto con buen ambiente. Todos los niveles bienvenidos.",
          date: "2024-01-18",
          time: "19:30",
          type: "FUTBOL_8",
          level: "BEGINNER",
          price: 9,
          maxPlayers: 16,
          currentPlayers: 13,
          status: "CONFIRMED",
          location: {
            name: "Polideportivo Oeste",
            address: "Av. Agraciada 3456, Montevideo",
            latitude: -34.8741,
            longitude: -56.2145,
          },
          captain: {
            id: "other-captain-2",
            name: "Carolina Vega",
            rating: 4.2,
          },
          players: [],
        },
        {
          id: "user-joined-3",
          title: "Fútbol 11 Competitivo - Estadio Municipal",
          description: "Partido oficial en cancha reglamentaria. Solo jugadores experimentados.",
          date: "2024-01-19",
          time: "16:00",
          type: "FUTBOL_11",
          level: "ADVANCED",
          price: 15,
          maxPlayers: 22,
          currentPlayers: 20,
          status: "CONFIRMED",
          location: {
            name: "Estadio Municipal Sur",
            address: "Rambla República de México 7890, Montevideo",
            latitude: -34.9111,
            longitude: -56.1745,
          },
          captain: {
            id: "other-captain-3",
            name: "Alejandro Ruiz",
            rating: 4.8,
          },
          players: [],
        },
        {
          id: "user-joined-4",
          title: "Fútbol 7 Express - Centro Comercial",
          description: "Partido rápido en el centro. Ideal para el horario de almuerzo.",
          date: "2024-01-21",
          time: "12:30",
          type: "FUTBOL_7",
          level: "INTERMEDIATE",
          price: 8,
          maxPlayers: 14,
          currentPlayers: 11,
          status: "PENDING",
          location: {
            name: "Centro Deportivo Plaza",
            address: "Plaza Independencia 456, Montevideo",
            latitude: -34.9081,
            longitude: -56.2015,
          },
          captain: {
            id: "other-captain-4",
            name: "Valeria Méndez",
            rating: 4.4,
          },
          players: [],
        },
      ]

      return {
        data: userMatches,
        success: true,
        message: "User matches loaded successfully",
      }
    } catch (error) {
      throw new Error("Failed to load user matches")
    }
  }

  // Review endpoints
  async submitReview(reviewData: Omit<Review, "id" | "createdAt">): Promise<ApiResponse<Review>> {
    return this.request("/reviews", {
      method: "POST",
      body: JSON.stringify(reviewData),
    })
  }

  async getPendingReviews(): Promise<ApiResponse<Match[]>> {
    return this.request("/reviews/pending")
  }
}

export const apiService = new ApiService()
