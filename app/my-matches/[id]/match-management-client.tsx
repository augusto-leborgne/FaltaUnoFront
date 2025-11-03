// ✅ CLIENT COMPONENT - Handles interactivity
"use client"

import { MatchManagementScreen } from "@/components/pages/match/match-management-screen"

interface MatchManagementClientProps {
  matchId: string
}

export default function MatchManagementClient({ matchId }: MatchManagementClientProps) {
  return <MatchManagementScreen matchId={matchId} />
}
