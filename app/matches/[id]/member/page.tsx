import MatchMemberScreen from "@/components/pages/match/match-member-screen"

interface MatchMemberPageProps {
  params: {
    id: string
  }
}

export default function MatchMemberPage({ params }: MatchMemberPageProps) {
  return <MatchMemberScreen matchId={params.id} />
}
