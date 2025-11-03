// ✅ SERVER COMPONENT - App Router Pattern
import { Suspense } from 'react'
import dynamicImport from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

const HomeClient = dynamicImport(
  () => import('./home-client'),
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
    <Suspense fallback={<LoadingSpinner size="lg" variant="green" />}>
      <HomeClient />
    </Suspense>
  )
}
