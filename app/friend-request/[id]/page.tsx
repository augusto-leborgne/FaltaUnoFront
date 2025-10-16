"use client"

import { FriendRequestScreen } from "@/components/pages/user/friend-request-screen"

interface FriendRequestPageProps {
  params: {
    id: string
  }
}

export default function FriendRequestPage({ params }: FriendRequestPageProps) {
  return <FriendRequestScreen userId={params.id} />
}