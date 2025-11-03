"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const token = AuthService.getToken()
    if (!token || AuthService.isTokenExpired(token)) {
      router.replace("/login")
      return
    }

    const user = AuthService.getUser()
    if (!user?.id) {
      router.replace("/login")
      return
    }
  }, [router])

  return (
    <div className="min-h-screen bg-white p-6">
      <h1 className="text-2xl font-bold">Home Page Test</h1>
      <p>Si ves esto, el problema está en algún componente de HomeScreen</p>
    </div>
  )
}
