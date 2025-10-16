import PlayerProfile from "@/components/pages/user/player-profile"

interface PlayerProfilePageProps {
  params: {
    id: string
  }
}

export default function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  return <PlayerProfile playerId={params.id} />
}