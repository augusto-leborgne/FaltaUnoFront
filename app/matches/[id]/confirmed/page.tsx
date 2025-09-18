import { MatchConfirmed } from "@/components/match-confirmed"

interface MatchConfirmedPageProps {
  params: {
    id: string
  }
}

export default function MatchConfirmedPage({ params }: MatchConfirmedPageProps) {
  return <MatchConfirmed matchId={params.id} />
}
