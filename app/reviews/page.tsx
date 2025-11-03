import dynamicImport from 'next/dynamic'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ReviewsClient = dynamicImport(() => import('./reviews-client'), { ssr: false })

export default function ReviewsPage() {
  return <ReviewsClient />
}
