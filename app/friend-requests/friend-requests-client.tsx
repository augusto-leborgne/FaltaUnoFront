"use client"

import { RequireAuthClientOnly } from "@/components/auth/client-only-wrapper"
import { FriendRequestsListScreen } from "@/components/pages/user/friend-requests-list-screen"

export default function FriendRequestsClient() {
  return (
    <RequireAuthClientOnly allowIncomplete allowUnverified>
      <FriendRequestsListScreen />
    </RequireAuthClientOnly>
  )
}
