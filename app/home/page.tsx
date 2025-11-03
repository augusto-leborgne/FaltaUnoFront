// ✅ SERVER COMPONENT - App Router Pattern
// This is a server component that handles routing and configuration
import { Suspense } from 'react'
import dynamicImport from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Dynamically import the client component
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
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" variant="green" />
      </div>
    }>
      <HomeClient />
    </Suspense>
  )
}