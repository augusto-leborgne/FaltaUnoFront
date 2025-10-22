// lib/navigation.ts
import { Usuario } from "./api"
import { useRouter } from "next/navigation"

const PROFILE_SETUP_ROUTE = "/profile-setup"
const VERIFICATION_ROUTE = "/verification"
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
  const foto = u?.fotoPerfil ?? u?.foto_perfil
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

  // ✅ CORRECCIÓN: Si no hay información de verificación, requiere verificación
  // (asumimos que usuarios nuevos necesitan verificar su cédula)
  return true
}

// API pública ---------------------------------------------------------

export function decidePostAuthRoute(user?: Usuario | null): string {
  if (!user) return PROFILE_SETUP_ROUTE
  if (isProfileIncomplete(user)) return PROFILE_SETUP_ROUTE
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