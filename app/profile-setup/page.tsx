import dynamicImport from 'next/dynamic'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ProfileSetupClient = dynamicImport(() => import('./profile-setup-client'), { ssr: false })

export default function ProfileSetupPage() {
  return <ProfileSetupClient />
}