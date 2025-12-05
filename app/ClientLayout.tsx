"use client"

import type React from "react"

import { Suspense } from "react"
import { Toaster } from "@/components/ui/toaster"
import { UpdateBanner } from "@/components/ui/update-banner"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { ErrorBoundary } from "@/components/error-boundary-wrapper"
import { ObservabilityProvider } from "@/components/observability/observability-provider"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ErrorBoundary>
      <ObservabilityProvider>
        <ProtectedRoute>
          <UpdateBanner />
          <Suspense fallback={
            <div className="min-h-screen bg-white flex items-center justify-center">
              <LoadingSpinner size="xl" variant="green" />
            </div>
          }>
            {children}
            <Toaster />
          </Suspense>
        </ProtectedRoute>
      </ObservabilityProvider>
    </ErrorBoundary>
  )
}
