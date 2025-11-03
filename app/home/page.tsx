import dynamic from 'next/dynamic'

const HomeClient = dynamic(() => import('./home-client'), { 
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-16 h-16">
          <div className="rounded-full border-[3px] border-green-300 w-16 h-16"></div>
          <div className="absolute inset-0 rounded-full border-[4px] border-transparent border-t-green-600 w-16 h-16 animate-spin"></div>
        </div>
        <p className="text-sm font-medium text-gray-600">Cargando...</p>
      </div>
    </div>
  )
})

export default function HomePage() {
  return <HomeClient />
}
