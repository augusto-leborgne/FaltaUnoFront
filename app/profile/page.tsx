"use client"

import RequireAuth from "@/components/auth/require-auth"
import { ProfileScreen } from "@/components/pages/user/profile-screen"

export default function ProfilePage() {
  return (
    <RequireAuth allowIncomplete allowUnverified>
      <ProfileScreen />
    </RequireAuth>
  )
}
