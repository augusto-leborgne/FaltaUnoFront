// Redirect to /my-matches/[id] for match management
import { redirect } from "next/navigation"

interface ManagePageProps {
  params: {
    id: string
  }
}

export default async function ManagePage({ params }: ManagePageProps) {
  const { id } = await params
  redirect(`/my-matches/${id}`)
}
