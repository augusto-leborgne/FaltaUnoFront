// ✅ CLIENT COMPONENT - Handles interactivity
"use client"

import { ErrorBoundary } from "@/components/error-boundary-wrapper"
import dynamicImport from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"

const SettingsScreen = dynamicImport(
  () => import("@/components/pages/user/settings-screen").then(mod => mod.SettingsScreen),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" variant="green" />
      </div>
    )
  }
)

export default function SettingsClient() {
  return (
    <ErrorBoundary>
      <SettingsScreen />
    </ErrorBoundary>
  )
}
