"use client"

import type React from "react"

import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { Toaster } from "@/components/ui/toaster"
import { UpdateBanner } from "@/components/ui/update-banner"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { ErrorBoundary } from "@/components/error-boundary-wrapper"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ErrorBoundary>
      <ProtectedRoute>
        <UpdateBanner />
        <Suspense fallback={<div>Loading...</div>}>
          {children}
          <Analytics />
          <Toaster />
        </Suspense>
      </ProtectedRoute>
    </ErrorBoundary>
  )
}
