import { MatchConfirmed } from "@/components/pages/match/match-confirmed"

interface MatchConfirmedPageProps {
  params: {
    id: string
  }
}

export default function MatchConfirmedPage({ params }: MatchConfirmedPageProps) {
  return <MatchConfirmed matchId={params.id} />
}
