"use client"

import dynamicImport from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ErrorBoundary } from "@/components/error-boundary-wrapper"

// ⚡ Lazy load SettingsScreen
const SettingsScreen = dynamicImport(
  () => import("@/components/pages/user/settings-screen").then(mod => ({ default: mod.SettingsScreen })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" variant="green" />
      </div>
    )
  }
)

export default function SettingsPage() {
  return (
    <ErrorBoundary>
      <SettingsScreen />
    </ErrorBoundary>
  )
}
