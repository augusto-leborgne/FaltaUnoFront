import { MatchChatScreen } from "@/components/pages/match/match-chat-screen"

interface MatchChatPageProps {
  params: {
    id: string
  }
}

export default function MatchChatPage({ params }: MatchChatPageProps) {
  return <MatchChatScreen matchId={params.id} />
}
