// ✅ CLIENT COMPONENT - Handles interactivity
"use client"

import { ChatsScreen } from "@/components/pages/chats/chats-screen"
import RequireAuth from "@/components/auth/require-auth"

export default function ChatsClient() {
  return (
    <RequireAuth>
      <ChatsScreen />
    </RequireAuth>
  )
}
