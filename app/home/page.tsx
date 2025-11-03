"use client"

import dynamic from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ErrorBoundary } from "@/components/error-boundary-wrapper"

// Prevent any server-side pre-rendering
export const dynamicParams = true
export const revalidate = 0

// ⚡ Lazy load HomeScreen for better initial bundle size
// FIX: Import the default export, not named export
const HomeScreenWithAuth = dynamic(
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

export default function HomePage() {
  return (
    <ErrorBoundary>
      <HomeScreenWithAuth />
    </ErrorBoundary>
  )
}