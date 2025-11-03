"use client"

import dynamicImport from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// Prevent any server-side pre-rendering
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

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
  return <HomeScreenWithAuth />
}