"use client"

// app/login/page.tsx
import dynamic from "next/dynamic"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// Force dynamic rendering
export const dynamicParams = true
export const revalidate = 0

// ✅ Deshabilitar SSR para evitar error 500 en producción
const LoginScreen = dynamic(
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