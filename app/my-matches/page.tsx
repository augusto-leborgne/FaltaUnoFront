"use client"

import dynamic from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// Force dynamic rendering
export const dynamicParams = true
export const revalidate = 0

// Deshabilitar SSR para evitar error 500 durante el render del servidor
const MyMatchesScreen = dynamic(
  () => import("@/components/pages/match/my-matches-screen").then(mod => ({ default: mod.MyMatchesScreen })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" variant="green" />
      </div>
    )
  }
)

export default function MyMatchesPage() {
  return <MyMatchesScreen />
}
