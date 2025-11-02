"use client"

import { RequireAuthClientOnly } from "@/components/auth/client-only-wrapper"
import { ProfileScreen } from "@/components/pages/user/profile-screen"

export default function ProfilePage() {
  return (
    <RequireAuthClientOnly allowIncomplete allowUnverified>
      <ProfileScreen />
    </RequireAuthClientOnly>
  )
}
