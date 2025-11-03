import dynamicImport from 'next/dynamic'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const NotificationsClient = dynamicImport(() => import('./notifications-client'), { ssr: false })

export default function NotificationsPage() {
  return <NotificationsClient />
}
