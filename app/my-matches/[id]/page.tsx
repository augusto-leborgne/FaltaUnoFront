import { MatchManagementScreen } from "@/components/pages/match/match-management-screen"

interface PageProps {
  params: {
    id: string
  }
}

export default function MatchManagementPage({ params }: PageProps) {
  return <MatchManagementScreen matchId={params.id} />
}
