// ✅ CLIENT COMPONENT - Handles interactivity
"use client"

import { ErrorBoundary } from "@/components/error-boundary-wrapper"
import { MatchesListing } from "@/components/pages/match/matches-listing"

export default function MatchesClient() {
  return (
    <ErrorBoundary>
      <MatchesListing />
    </ErrorBoundary>
  )
}
