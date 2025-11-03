"use client"

import dynamic from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// Force dynamic rendering
export const dynamicParams = true
export const revalidate = 0

// ⚡ Lazy load the MatchesListing component for better performance
const MatchesListing = dynamic(
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
