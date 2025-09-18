import { UserProfileScreen } from "@/components/user-profile-screen"

interface UserProfilePageProps {
  params: {
    id: string
  }
}

export default function UserProfilePage({ params }: UserProfilePageProps) {
  return <UserProfileScreen userId={params.id} />
}
