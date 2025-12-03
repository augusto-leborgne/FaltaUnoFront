export type OnboardingStep = "VERIFY_EMAIL" | "COMPLETE_PROFILE" | "VERIFY_CEDULA" | "DONE";

export interface OnboardingStatus {
  nextStep: OnboardingStep;
  requiresAction: boolean;
  emailVerified: boolean;
  perfilCompleto: boolean;
  cedulaVerificada: boolean;
  blockingReason?: string;
}

export interface OnboardingFlags {
  emailVerified?: boolean | null;
  perfilCompleto?: boolean | null;
  cedulaVerificada?: boolean | null;
}

const STEP_MESSAGES: Record<OnboardingStep, string> = {
  VERIFY_EMAIL: "Debes verificar tu email para continuar.",
  COMPLETE_PROFILE: "Completa tu perfil para desbloquear el resto de la app.",
  VERIFY_CEDULA: "Verificá y guardá tu cédula para finalizar el registro.",
  DONE: "Onboarding completo",
};

export const ONBOARDING_ROUTES: Record<OnboardingStep, string> = {
  VERIFY_EMAIL: "/verify-email",
  COMPLETE_PROFILE: "/profile-setup",
  VERIFY_CEDULA: "/verification",
  DONE: "/home",
};

const asBool = (value: boolean | string | undefined | null): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return undefined;
};

export const isOnboardingComplete = (status?: OnboardingStatus | null): boolean => {
  if (!status) return false;
  return !status.requiresAction || status.nextStep === "DONE";
};

export function computeOnboardingFromFlags(flags?: OnboardingFlags | null): OnboardingStatus {
  const emailVerified = asBool(flags?.emailVerified) ?? false;
  const perfilCompleto = asBool(flags?.perfilCompleto) ?? false;
  const cedulaVerificada = asBool(flags?.cedulaVerificada) ?? false;

  let nextStep: OnboardingStep = "DONE";
  if (!emailVerified) {
    nextStep = "VERIFY_EMAIL";
  } else if (!perfilCompleto) {
    nextStep = "COMPLETE_PROFILE";
  } else if (!cedulaVerificada) {
    nextStep = "VERIFY_CEDULA";
  }

  return {
    nextStep,
    requiresAction: nextStep !== "DONE",
    emailVerified,
    perfilCompleto,
    cedulaVerificada,
    blockingReason: STEP_MESSAGES[nextStep],
  };
}

export function mergeOnboardingStatus(
  status?: Partial<OnboardingStatus> | null,
  flags?: OnboardingFlags | null
): OnboardingStatus {
  const fallback = computeOnboardingFromFlags(flags);
  return {
    nextStep: status?.nextStep ?? fallback.nextStep,
    requiresAction:
      typeof status?.requiresAction === "boolean"
        ? status.requiresAction
        : fallback.requiresAction,
    emailVerified:
      typeof status?.emailVerified === "boolean"
        ? status.emailVerified
        : fallback.emailVerified,
    perfilCompleto:
      typeof status?.perfilCompleto === "boolean"
        ? status.perfilCompleto
        : fallback.perfilCompleto,
    cedulaVerificada:
      typeof status?.cedulaVerificada === "boolean"
        ? status.cedulaVerificada
        : fallback.cedulaVerificada,
    blockingReason: status?.blockingReason ?? fallback.blockingReason,
  };
}

export const resolveOnboardingRoute = (
  step?: OnboardingStep | null,
  defaultRoute: string = ONBOARDING_ROUTES.DONE
): string => {
  if (!step) return defaultRoute;
  return ONBOARDING_ROUTES[step] ?? defaultRoute;
};
