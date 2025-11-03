"use client"

import dynamicImport from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ErrorBoundary } from "@/components/error-boundary-wrapper"

// Force client-side only rendering
export const dynamic = 'force-dynamic'

// ⚡ Lazy load MyMatchesScreen
const MyMatchesScreen = dynamicImport(
  () => import("@/components/pages/match/my-matches-screen").then(mod => ({ default: mod.MyMatchesScreen })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" variant="green" />
      </div>
    )
  }
)

export default function MyMatchesPage() {
  return (
    <ErrorBoundary>
      <MyMatchesScreen />
    </ErrorBoundary>
  )
}
