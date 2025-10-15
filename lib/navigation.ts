// lib/navigation.ts
import { Usuario } from "./api";
import { useRouter } from "next/navigation";

export function decidePostAuthRoute(user?: Usuario | null): string {
  if (!user) return "/profile-setup";          // si no hay user -> completar perfil
  const perfilCompleto = (user as any).perfilCompleto;
  const cedulaVerificada = (user as any).cedulaVerificada;

  if (!perfilCompleto) return "/profile-setup";
  if (!cedulaVerificada) return "/verification";
  return "/";
}

export function usePostAuthRedirect() {
  const router = useRouter();
  return (user?: Usuario | null) => {
    const route = decidePostAuthRoute(user);
    router.push(route);
  };
}