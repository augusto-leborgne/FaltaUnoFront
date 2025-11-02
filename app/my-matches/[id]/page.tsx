"use client"

import dynamic from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// Deshabilitar SSR para evitar error 500 durante el render del servidor
const MatchManagementScreen = dynamic(
  () => import("@/components/pages/match/match-management-screen").then(mod => ({ default: mod.MatchManagementScreen })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
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
