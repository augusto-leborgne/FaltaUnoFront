import { MatchConfirmation } from "@/components/match-confirmation"

interface MatchConfirmationPageProps {
  params: {
    id: string
  }
}

export default function MatchConfirmationPage({ params }: MatchConfirmationPageProps) {
  return <MatchConfirmation matchId={params.id} />
}
