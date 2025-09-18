import { MatchDetail } from "@/components/match-detail"

interface MatchDetailPageProps {
  params: {
    id: string
  }
}

export default function MatchDetailPage({ params }: MatchDetailPageProps) {
  return <MatchDetail matchId={params.id} />
}
