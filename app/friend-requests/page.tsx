import RequireAuth from "@/components/auth/require-auth"
import { FriendRequestsListScreen } from "@/components/pages/user/friend-requests-list-screen"

export default function FriendRequestsPage() {
  return (
    <RequireAuth allowIncomplete allowUnverified>
      <FriendRequestsListScreen />
    </RequireAuth>
  )
}