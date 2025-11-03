// ✅ CLIENT COMPONENT - Handles interactivity
"use client"

import { ErrorBoundary } from "@/components/error-boundary-wrapper"
import dynamicImport from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"

const MatchesListing = dynamicImport(
  () => import("@/components/pages/match/matches-listing").then(mod => mod.MatchesListing),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" variant="green" />
      </div>
    )
  }
)

export default function MatchesClient() {
  return (
    <ErrorBoundary>
      <MatchesListing />
    </ErrorBoundary>
  )
}
