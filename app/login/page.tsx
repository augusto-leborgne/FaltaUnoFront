"use client"

// app/login/page.tsx
import dynamicImport from "next/dynamic"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// Force client-side only rendering
export const dynamic = 'force-dynamic'

// ✅ Deshabilitar SSR para evitar error 500 en producción
const LoginScreen = dynamicImport(
  () => import("@/components/pages/login/login-screen").then((mod) => mod.LoginScreen),
  { 
    ssr: false, 
    loading: () => (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" variant="green" />
      </div>
    )
  }
)

export default function LoginPage() {
  return <LoginScreen />
}