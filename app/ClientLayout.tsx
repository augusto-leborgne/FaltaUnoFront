"use client"

import type React from "react"

import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { Toaster } from "@/components/ui/toaster"
import { useVersionCheck } from "@/hooks/use-version-check"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Detectar nuevas versiones y forzar recarga automática
  useVersionCheck()
  
  return (
    <ProtectedRoute>
      <Suspense fallback={<div>Loading...</div>}>
        {children}
        <Analytics />
        <Toaster />
      </Suspense>
    </ProtectedRoute>
  )
}
