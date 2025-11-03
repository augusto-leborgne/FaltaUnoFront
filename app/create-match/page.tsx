"use client"

import dynamic from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// Force dynamic rendering
export const dynamicParams = true
export const revalidate = 0

// ⚡ Lazy load CreateMatchScreen for better performance (includes Google Maps)
const CreateMatchScreen = dynamic(
  () => import("@/components/pages/match/create-match").then(mod => ({ default: mod.CreateMatchScreen })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" variant="green" text="Cargando formulario..." />
      </div>
    )
  }
)

export default function CreateMatchPage() {
  return <CreateMatchScreen />
}
