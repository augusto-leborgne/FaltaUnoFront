"use client"

import { useEffect, useState } from 'react'
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// Prevent any server-side pre-rendering
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default function HomePage() {
  const [HomeComponent, setHomeComponent] = useState<React.ComponentType | null>(null)

  useEffect(() => {
    // Only load component on client-side
    import("@/components/pages/home-screen-wrapper")
      .then(mod => setHomeComponent(() => mod.HomeScreenWithAuth))
      .catch(err => console.error("Error loading home screen:", err))
  }, [])

  if (!HomeComponent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" variant="green" />
      </div>
    )
  }

  return <HomeComponent />
}