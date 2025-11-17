// lib/navigation.ts
import { Usuario } from "./api"
import { useRouter } from "next/navigation"

const PROFILE_SETUP_ROUTE = "/profile-setup"
const VERIFICATION_ROUTE = "/verification"
const PHONE_VERIFICATION_ROUTE = "/phone-verification"
const HOME_ROUTE = "/home"

// Helpers -------------------------------------------------------------

function asBool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v
  if (typeof v === "string") {
    const s = v.trim().toLowerCase()
    if (s === "true") return true
    if (s === "false") return false
  }
  return undefined
}

function isApprovedStatus(s: unknown): boolean {
  if (!s) return false
  const up = String(s).toUpperCase()
  // Estados “aprobado/verificado” típicos
  return ["APROBADA", "APROBADO", "APPROVED", "VERIFIED", "OK", "SUCCESS"].includes(up)
}

function isPendingOrFailedStatus(s: unknown): boolean {
  if (!s) return false
  const up = String(s).toUpperCase()
  return ["PENDIENTE", "PENDING", "RECHAZADA", "RECHAZADO", "FAILED", "ERROR"].includes(up)
}

function hasBasicProfile(u: any): boolean {
  // Ajustá estos campos a tu modelo si querés ser más estricto
  const nombre = u?.nombre
  const apellido = u?.apellido
  // AuthService may strip foto fields to save quota and expose `hasFotoPerfil`
  const foto = u?.hasFotoPerfil ?? u?.fotoPerfil ?? u?.foto_perfil
  return Boolean(nombre && apellido && foto)
}

function isProfileIncomplete(user?: Usuario | null): boolean {
  if (!user) return true
  const explicit = asBool((user as any)?.perfilCompleto)
  if (explicit !== undefined) return !explicit
  // Si no hay flag explícito, usamos una heurística básica
  return !hasBasicProfile(user)
}

function needsIdVerification(user?: Usuario | null): boolean {
  if (!user) return false

  // TODO: Verificación de cédula deshabilitada temporalmente
  // return false siempre - no requerir verificación
  return false

  /* CÓDIGO ORIGINAL - Mantener para futura implementación de badge verificado
  // Booleans directos
  const b1 = asBool((user as any)?.cedulaVerificada)
  if (b1 !== undefined) return !b1

  const b2 = asBool((user as any)?.documentoVerificado)
  if (b2 !== undefined) return !b2

  const b3 = asBool((user as any)?.identityVerified)
  if (b3 !== undefined) return !b3

  // Estados anidados típicos
  const estado =
    (user as any)?.verificacionCedula?.estado ??
    (user as any)?.verificacionDocumento?.estado ??
    (user as any)?.identity?.status

  if (isApprovedStatus(estado)) return false
  if (isPendingOrFailedStatus(estado)) return true

  // ✅ FIX: Si no hay información explícita de verificación, NO requerimos verificación
  // (cedulaVerificada es opcional - si está undefined, asumimos que está OK)
  return false
  */
}

function needsPhoneVerification(user?: Usuario | null): boolean {
  if (!user) return false
  
  // ⚡ CAMBIO: Solo pedir verificación si el perfil NO está completo
  // Si perfilCompleto === true, significa que ya pasó por el flujo completo
  // No volver a pedirle el celular en cada login
  const isComplete = asBool((user as any)?.perfilCompleto)
  if (isComplete === true) {
    return false // Perfil completo - no pedir celular aunque no lo tenga
  }
  
  // Solo verificar celular durante el flujo de registro/setup
  const celular = (user as any)?.celular
  return !celular || celular.trim() === ""
}

// API pública ---------------------------------------------------------

export function decidePostAuthRoute(user?: Usuario | null): string {
  if (!user) return PROFILE_SETUP_ROUTE
  
  // ⚡ FLUJO SIMPLIFICADO:
  // 1. Si perfil incompleto -> profile-setup (incluye foto, datos básicos)
  // 2. Si perfil completo -> home (sin importar si tiene celular o no)
  // El celular solo se pide durante el flujo de registro inicial
  
  if (isProfileIncomplete(user)) return PROFILE_SETUP_ROUTE
  
  // ⚡ NUEVO: Phone verification solo durante registro, no en login
  // Si llegamos aquí con perfil completo, ir directo a home
  if (needsIdVerification(user)) return VERIFICATION_ROUTE
  
  return HOME_ROUTE
}

/**
 * Redirige después de autenticar.
 * Por defecto hace `replace` para evitar que el usuario vuelva a /login con "Atrás".
 */
export function usePostAuthRedirect() {
  const router = useRouter()
  return (
    user?: Usuario | null,
    opts: { replace?: boolean } = { replace: true }
  ) => {
    const route = decidePostAuthRoute(user)
    if (opts.replace ?? true) router.replace(route)
    else router.push(route)
  }
}