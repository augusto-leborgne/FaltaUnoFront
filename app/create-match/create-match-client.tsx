// ✅ CLIENT COMPONENT - Handles interactivity
"use client"

import { ErrorBoundary } from "@/components/error-boundary-wrapper"
import dynamicImport from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"

const CreateMatchScreen = dynamicImport(
  () => import("@/components/pages/match/create-match").then(mod => mod.CreateMatchScreen),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" variant="green" text="Cargando formulario..." />
      </div>
    )
  }
)

export default function CreateMatchClient() {
  return (
    <ErrorBoundary>
      <CreateMatchScreen />
    </ErrorBoundary>
  )
}
