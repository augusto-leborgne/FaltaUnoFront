import { MatchManagementScreen } from "@/components/match-management-screen"

interface PageProps {
  params: {
    id: string
  }
}

export default function MatchManagementPage({ params }: PageProps) {
  return <MatchManagementScreen matchId={params.id} />
}
