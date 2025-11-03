// ✅ CLIENT COMPONENT - Handles interactivity
"use client"

import { ErrorBoundary } from "@/components/error-boundary-wrapper"
import { CreateMatchScreen } from "@/components/pages/match/create-match"

export default function CreateMatchClient() {
  return (
    <ErrorBoundary>
      <CreateMatchScreen />
    </ErrorBoundary>
  )
}
