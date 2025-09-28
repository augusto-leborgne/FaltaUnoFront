// components/RequireAuth.tsx
"use client";
import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuthContext } from "@/components/auth-provider";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (!loading && !user) {
      const returnTo = pathname + (search ? "?" + search.toString() : "");
      router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [user, loading, router, pathname, search]);

  if (loading || !user) return <div className="p-8">Cargando…</div>;
  return <>{children}</>;
}