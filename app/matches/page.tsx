"use client"

import dynamicImport from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// Force client-side only rendering
export const dynamic = 'force-dynamic'

// ⚡ Lazy load the MatchesListing component for better performance
const MatchesListing = dynamicImport(
  () => import("@/components/pages/match/matches-listing").then(mod => ({ default: mod.MatchesListing })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" variant="green" />
      </div>
    )
  }
)

export default function MatchesPage() {
  return <MatchesListing />
}
