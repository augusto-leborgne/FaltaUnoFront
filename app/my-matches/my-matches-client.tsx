// ✅ CLIENT COMPONENT - Handles interactivity
"use client"

import { ErrorBoundary } from "@/components/error-boundary-wrapper"
import dynamicImport from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"

const MyMatchesScreen = dynamicImport(
  () => import("@/components/pages/match/my-matches-screen").then(mod => mod.MyMatchesScreen),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" variant="green" />
      </div>
    )
  }
)

export default function MyMatchesClient() {
  return (
    <ErrorBoundary>
      <MyMatchesScreen />
    </ErrorBoundary>
  )
}
