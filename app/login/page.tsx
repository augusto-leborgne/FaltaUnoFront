"use client"

// app/login/page.tsx
import { LoginScreen } from "@/components/pages/login/login-screen"

// Force client-side only rendering
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return <LoginScreen />
}