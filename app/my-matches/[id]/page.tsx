"use client"

import dynamicImport from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// Force client-side only rendering
export const dynamic = 'force-dynamic'

// Deshabilitar SSR para evitar error 500 durante el render del servidor
const MatchManagementScreen = dynamicImport(
  () => import("@/components/pages/match/match-management-screen").then(mod => ({ default: mod.MatchManagementScreen })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" variant="green" />
      </div>
    )
  }
)

interface PageProps {
  params: {
    id: string
  }
}

export default function MatchManagementPage({ params }: PageProps) {
  return <MatchManagementScreen matchId={params.id} />
}
