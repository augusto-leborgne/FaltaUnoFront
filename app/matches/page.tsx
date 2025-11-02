"use client"

import dynamic from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// ⚡ Lazy load the MatchesListing component for better performance
const MatchesListing = dynamic(
  () => import("@/components/pages/match/matches-listing").then(mod => ({ default: mod.MatchesListing })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" variant="green" />
      </div>
    )
  }
)

export default function MatchesPage() {
  return <MatchesListing />
}
