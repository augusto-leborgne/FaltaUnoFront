"use client"

import dynamicImport from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ErrorBoundary } from "@/components/error-boundary-wrapper"

// Prevent any server-side pre-rendering
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// ⚡ Lazy load HomeScreen for better initial bundle size
const HomeScreenWithAuth = dynamicImport(
  () => import("@/components/pages/home-screen-wrapper").then(mod => ({ default: mod.HomeScreenWithAuth })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" variant="green" />
      </div>
    )
  }
)

export default function HomePage() {
  return (
    <ErrorBoundary>
      <HomeScreenWithAuth />
    </ErrorBoundary>
  )
}