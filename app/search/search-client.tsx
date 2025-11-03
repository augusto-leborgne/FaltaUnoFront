// ✅ CLIENT COMPONENT - Handles interactivity
"use client"

import { ErrorBoundary } from "@/components/error-boundary-wrapper"
import { SearchScreen } from "@/components/pages/search-screen"

export default function SearchClient() {
  return (
    <ErrorBoundary>
      <SearchScreen />
    </ErrorBoundary>
  )
}
