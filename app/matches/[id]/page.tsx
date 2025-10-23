import { MatchDetail } from "@/components/pages/match/match-detail"

interface MatchDetailPageProps {
  params: {
    id: string
  }
}

export default async function MatchDetailPage({ params }: MatchDetailPageProps) {
  const { id } = await Promise.resolve(params)
  return <MatchDetail matchId={id} />
}
