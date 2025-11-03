import dynamicImport from 'next/dynamic'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const RegisterClient = dynamicImport(() => import('./register-client'), { ssr: false })

export default function RegisterPage() {
  return <RegisterClient />
}