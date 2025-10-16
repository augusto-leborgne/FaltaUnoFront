import { MatchDetail } from "@/components/pages/match/match-detail"

interface MatchDetailPageProps {
  params: {
    id: string
  }
}

export default function MatchDetailPage({ params }: MatchDetailPageProps) {
  return <MatchDetail matchId={params.id} />
}
