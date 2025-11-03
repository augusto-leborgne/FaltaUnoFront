// ✅ CLIENT COMPONENT - Handles interactivity
"use client"

import { ErrorBoundary } from "@/components/error-boundary-wrapper"
import { HomeScreenWithAuth } from "@/components/pages/home-screen-wrapper"

export default function HomeClient() {
  return (
    <ErrorBoundary>
      <HomeScreenWithAuth />
    </ErrorBoundary>
  )
}
