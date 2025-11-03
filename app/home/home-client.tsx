// ✅ CLIENT COMPONENT - Handles interactivity
"use client"

import { ErrorBoundary } from "@/components/error-boundary-wrapper"
import dynamicImport from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// Lazy load the actual home screen component
const HomeScreenWithAuth = dynamicImport(
  () => import("@/components/pages/home-screen-wrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" variant="green" />
      </div>
    )
  }
)

export default function HomeClient() {
  return (
    <ErrorBoundary>
      <HomeScreenWithAuth />
    </ErrorBoundary>
  )
}
