import { FriendRequestScreen } from "@/components/friend-request-screen"

interface FriendRequestPageProps {
  params: {
    id: string
  }
}

export default function FriendRequestPage({ params }: FriendRequestPageProps) {
  return <FriendRequestScreen userId={params.id} />
}
