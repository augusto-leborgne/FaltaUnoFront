// ✅ CLIENT COMPONENT - Handles interactivity
"use client"

import { HomeScreen } from "@/components/pages/home-screen"
import RequireAuth from "@/components/auth/require-auth"

export default function HomeClient() {
  return (
    <RequireAuth allowIncomplete={false} allowUnverified={false}>
      <HomeScreen />
    </RequireAuth>
  )
}
