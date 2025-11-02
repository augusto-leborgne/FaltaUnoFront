"use client"

import dynamic from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// ⚡ Lazy load SearchScreen for better performance
const SearchScreen = dynamic(
  () => import("@/components/pages/search-screen").then(mod => ({ default: mod.SearchScreen })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" variant="green" />
      </div>
    )
  }
)

export default function SearchPage() {
  return <SearchScreen />
}
