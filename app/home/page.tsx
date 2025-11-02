"use client"

import dynamic from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"

const HomeScreenWithAuth = dynamic(
  () => import("@/components/pages/home-screen-wrapper"),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }
)

export default function HomePage() {
  return <HomeScreenWithAuth />
}