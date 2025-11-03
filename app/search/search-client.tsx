// ✅ CLIENT COMPONENT - Handles interactivity
"use client"

import { ErrorBoundary } from "@/components/error-boundary-wrapper"
import dynamicImport from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"

const SearchScreen = dynamicImport(
  () => import("@/components/pages/search-screen").then(mod => mod.SearchScreen),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" variant="green" />
      </div>
    )
  }
)

export default function SearchClient() {
  return (
    <ErrorBoundary>
      <SearchScreen />
    </ErrorBoundary>
  )
}
