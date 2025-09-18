import { MatchChatScreen } from "@/components/match-chat-screen"

interface MatchChatPageProps {
  params: {
    id: string
  }
}

export default function MatchChatPage({ params }: MatchChatPageProps) {
  return <MatchChatScreen matchId={params.id} />
}
