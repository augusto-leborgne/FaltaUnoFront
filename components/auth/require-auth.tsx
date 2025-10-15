"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuthContext } from "./auth-provider";
import { AuthService } from "@/lib/auth";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, setUser } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const validateAuth = async () => {
      if (loading) return;

      AuthService.validateAndCleanup();

      const token = AuthService.getToken();
      const localUser = AuthService.getUser();

      if (!token || AuthService.isTokenExpired(token)) {
        AuthService.logout();
        const returnTo = pathname + (search ? "?" + search.toString() : "");
        router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        setIsValidating(false);
        return;
      }

      if (!user && localUser) {
        setUser(localUser);
      }

      setIsValidating(false);
    };

    validateAuth();
  }, [user, loading, router, pathname, search, setUser]);

  if (loading || isValidating || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}