import dynamicImport from 'next/dynamic'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const FriendsClient = dynamicImport(() => import('./friends-client'), { ssr: false })

export default function FriendsPage() {
  return <FriendsClient />
}
