// ✅ CLIENT COMPONENT - Handles interactivity
"use client"

import { ErrorBoundary } from "@/components/error-boundary-wrapper"
import { RequireAuthClientOnly } from "@/components/auth/client-only-wrapper"
import { HomeScreen } from "@/components/pages/home-screen"

export default function HomeClient() {
  // Diagnostic logs to detect undefined component causing runtime error 500
  // These will appear in Cloud Run logs and help identify which import is undefined
  try {
    // eslint-disable-next-line no-console
    console.debug('[home-client] typeof ErrorBoundary =', typeof ErrorBoundary)
    // eslint-disable-next-line no-console
    console.debug('[home-client] typeof RequireAuthClientOnly =', typeof RequireAuthClientOnly)
    // eslint-disable-next-line no-console
    console.debug('[home-client] typeof HomeScreen =', typeof HomeScreen)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[home-client] error inspecting components', e)
  }

  // Safe render: if any component is undefined, render a minimal fallback so we can
  // avoid a hard crash and also surface which one is missing via console.
  if (typeof ErrorBoundary === 'undefined' || typeof RequireAuthClientOnly === 'undefined' || typeof HomeScreen === 'undefined') {
    // eslint-disable-next-line no-console
    console.error('[home-client] One or more components are undefined', {
      ErrorBoundary: typeof ErrorBoundary,
      RequireAuthClientOnly: typeof RequireAuthClientOnly,
      HomeScreen: typeof HomeScreen,
    })

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-lg font-bold">Error loading home components</h1>
          <p className="text-sm text-muted-foreground">Check server logs for details (home-client diagnostic)</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <RequireAuthClientOnly allowIncomplete={false} allowUnverified={false}>
        <HomeScreen />
      </RequireAuthClientOnly>
    </ErrorBoundary>
  )
}
