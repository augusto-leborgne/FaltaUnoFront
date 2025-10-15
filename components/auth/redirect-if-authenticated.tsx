"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "./auth-provider";
import { AuthService } from "@/lib/auth";

interface Props {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function RedirectIfAuthenticated({ children, redirectTo = "/home" }: Props) {
  const router = useRouter();
  const { user, loading, setUser } = useAuthContext();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function check() {
      if (loading) return;

      AuthService.validateAndCleanup();

      const token = AuthService.getToken();
      const localUser = AuthService.getUser();

      if (!token) {
        setChecking(false);
        return;
      }

      if (user || localUser) {
        router.push(redirectTo);
        return;
      }

      try {
        const serverUser = await AuthService.fetchCurrentUser();
        if (serverUser) {
          AuthService.setUser(serverUser);
          setUser(serverUser);
          router.push(redirectTo);
        } else {
          AuthService.logout();
          setChecking(false);
        }
      } catch (err) {
        console.warn("[RedirectIfAuthenticated] validateWithServer failed", err);
        AuthService.logout();
        setChecking(false);
      }
    }

    check();
  }, [loading, user, router, setUser, redirectTo]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}