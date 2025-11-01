"use client"

// app/login/page.tsx
import dynamic from "next/dynamic"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

const RedirectIfAuthenticated = dynamic(
  () => import("@/components/auth/redirect-if-authenticated"),
  { ssr: false, loading: () => <LoadingSpinner size="xl" variant="green" /> }
)

const LoginScreen = dynamic(
  () => import("@/components/pages/login/login-screen").then((mod) => ({ default: mod.LoginScreen })),
  { ssr: false, loading: () => <LoadingSpinner size="lg" variant="green" /> }
)

export default function LoginPage() {
  return (
    <RedirectIfAuthenticated>
      <LoginScreen />
    </RedirectIfAuthenticated>
  );
}