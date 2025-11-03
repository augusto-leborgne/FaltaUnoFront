import dynamicImport from 'next/dynamic'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const FriendRequestsClient = dynamicImport(() => import('./friend-requests-client'), { ssr: false })

export default function FriendRequestsPage() {
  return <FriendRequestsClient />
}