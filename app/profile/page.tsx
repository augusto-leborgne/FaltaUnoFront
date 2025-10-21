"use client"

import RequireAuth from "@/components/auth/require-auth"

function ProfileScreen() {
  return <div className="p-4">Mi perfil</div> // tu UI real acá
}

export default function ProfilePage() {
  return (
    <RequireAuth allowIncomplete allowUnverified>
      <ProfileScreen />
    </RequireAuth>
  )
}
