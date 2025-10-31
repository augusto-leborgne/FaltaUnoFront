"use client"

import type React from "react"

import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { Toaster } from "@/components/ui/toaster"
import { UpdateBanner } from "@/components/ui/update-banner"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <UpdateBanner />
      <Suspense fallback={<div>Loading...</div>}>
        {children}
        <Analytics />
        <Toaster />
      </Suspense>
    </ProtectedRoute>
  )
}
