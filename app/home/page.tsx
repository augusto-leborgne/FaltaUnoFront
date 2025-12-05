// ✅ SERVER COMPONENT - App Router Pattern
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
      <div className="flex items-center justify-center min-h-screen bg-white">
        <LoadingSpinner size="xl" variant="green" />
      </div>
    )
  }
)

export default function HomePage() {
  return <HomeClient />
}
