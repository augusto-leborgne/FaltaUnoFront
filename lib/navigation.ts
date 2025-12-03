// lib/navigation.ts
import { Usuario } from "./api"
import { useRouter } from "next/navigation"
import { mergeOnboardingStatus, OnboardingStatus, resolveOnboardingRoute } from "./onboarding"

const HOME_ROUTE = "/home"

type PostAuthRedirectOptions = {
  replace?: boolean
  onboarding?: Partial<OnboardingStatus> | null
  fallbackRoute?: string
  query?: Record<string, string | undefined | null>
}

const buildOnboardingStatus = (
  user?: Usuario | null,
  override?: Partial<OnboardingStatus> | null
) =>
  mergeOnboardingStatus(override, {
    emailVerified: user?.emailVerified,
    perfilCompleto: user?.perfilCompleto,
    cedulaVerificada: user?.cedulaVerificada,
  })

const buildQueryString = (query?: Record<string, string | undefined | null>) => {
  if (!query) return ""
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      params.append(key, value)
    }
  }
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ""
}

export function decidePostAuthRoute(
  user?: Usuario | null,
  override?: Partial<OnboardingStatus> | null
): string {
  const status = buildOnboardingStatus(user, override)
  if (!status.requiresAction) return HOME_ROUTE
  return resolveOnboardingRoute(status.nextStep, HOME_ROUTE)
}

export function usePostAuthRedirect() {
  const router = useRouter()
  return (
    user?: Usuario | null,
    opts: PostAuthRedirectOptions = {}
  ) => {
    const fallbackRoute = opts.fallbackRoute ?? HOME_ROUTE
    const status = buildOnboardingStatus(user, opts.onboarding)
    const baseRoute = status.requiresAction
      ? resolveOnboardingRoute(status.nextStep, fallbackRoute)
      : fallbackRoute
    const querySuffix = buildQueryString(opts.query)
    const target = `${baseRoute}${querySuffix}`

    if (opts.replace ?? true) router.replace(target)
    else router.push(target)

    return target
  }
}