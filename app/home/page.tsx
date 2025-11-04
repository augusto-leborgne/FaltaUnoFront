// ✅ SERVER COMPONENT - App Router Pattern
// Testing with minimal component to isolate the undefined issue
import dynamicImport from 'next/dynamic'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

const MinimalHome = dynamicImport(
  () => import('./minimal-home'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-12 h-12">
            <div className="rounded-full border-[3px] border-green-300 w-12 h-12" />
            <div 
              className="absolute inset-0 rounded-full border-[4px] border-transparent border-t-green-600 w-12 h-12 animate-spin"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0%, transparent 70%, #16a34a 70%, #16a34a 100%)',
              }}
            />
          </div>
          <p className="text-sm font-medium text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }
)

export default function HomePage() {
  return <MinimalHome />
}
