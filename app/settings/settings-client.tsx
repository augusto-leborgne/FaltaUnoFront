// ✅ CLIENT COMPONENT - Handles interactivity
"use client"

import { ErrorBoundary } from "@/components/error-boundary-wrapper"
import { SettingsScreen } from "@/components/pages/user/settings-screen"

export default function SettingsClient() {
  return (
    <ErrorBoundary>
      <SettingsScreen />
    </ErrorBoundary>
  )
}
