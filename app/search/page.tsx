// ✅ SERVER COMPONENT - App Router Pattern
import { Suspense } from 'react'
import dynamicImport from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

const SearchClient = dynamicImport(
  () => import('./search-client'),
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
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" variant="green" />
      </div>
    }>
      <SearchClient />
    </Suspense>
  )
}
