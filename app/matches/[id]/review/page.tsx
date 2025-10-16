import { MatchReviewScreen } from "@/components/pages/match/match-review-screen"

interface PageProps {
  params: {
    id: string
  }
}

export default function MatchReviewPage({ params }: PageProps) {
  return <MatchReviewScreen matchId={params.id} />
}
