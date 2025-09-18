import { MatchReviewScreen } from "@/components/match-review-screen"

interface PageProps {
  params: {
    id: string
  }
}

export default function MatchReviewPage({ params }: PageProps) {
  return <MatchReviewScreen matchId={params.id} />
}
