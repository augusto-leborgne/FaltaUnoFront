import { UsuarioAPI, Usuario } from "./api"

const STORAGE_TOKEN_KEY = "authToken"
const STORAGE_USER_KEY = "user"

export const AuthService = {
  login: async (email: string, password: string) => {
    const res = await UsuarioAPI.login(email, password)
    if (res.success) {
      localStorage.setItem(STORAGE_TOKEN_KEY, res.data.token)
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(res.data.user))
    }
    return res
  },

  logout: () => {
    localStorage.removeItem(STORAGE_TOKEN_KEY)
    localStorage.removeItem(STORAGE_USER_KEY)
  },

  getToken: () => localStorage.getItem(STORAGE_TOKEN_KEY),

  getUser: (): Usuario | null => {
    const raw = localStorage.getItem(STORAGE_USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as Usuario
    } catch {
      return null
    }
  },

  isLoggedIn: () => localStorage.getItem(STORAGE_TOKEN_KEY) != null
}