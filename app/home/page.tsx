"use client"

import dynamicImport from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// Force client-side only rendering
export const dynamic = 'force-dynamic'

const HomeScreenWithAuth = dynamicImport(
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
  return <HomeScreenWithAuth />
}