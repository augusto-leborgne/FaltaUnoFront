"use client"

import dynamicImport from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ErrorBoundary } from "@/components/error-boundary-wrapper"

// Force client-side only rendering
export const dynamic = 'force-dynamic'

// ⚡ Lazy load SearchScreen for better performance
const SearchScreen = dynamicImport(
  () => import("@/components/pages/search-screen").then(mod => ({ default: mod.SearchScreen })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" variant="green" />
      </div>
    )
  }
)

export default function SearchPage() {
  return (
    <ErrorBoundary>
      <SearchScreen />
    </ErrorBoundary>
  )
}
