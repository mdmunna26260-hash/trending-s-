import { ReviewManager } from '@/components/admin/ReviewActions'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function AdminReviewsPage({ searchParams }: { searchParams: { status?: string } }) {
  const where: any = {}
  if (searchParams.status === 'pending') where.isApproved = false
  if (searchParams.status === 'approved') where.isApproved = true

  const reviews = await prisma.review.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      product: { select: { name: true, slug: true } },
      customer: { select: { name: true, phone: true } },
    },
  })

  return (
    <>
      <div className="admin__topbar">
        <div>
          <div className="eyebrow">Sell</div>
          <h1 className="page-title mt-2">Reviews</h1>
        </div>
        <div className="row gap-2">
          <a className={`btn btn--sm ${!searchParams.status ? '' : 'btn--ghost'}`} href="/admin/reviews">
            All
          </a>
          <a className={`btn btn--sm ${searchParams.status === 'pending' ? '' : 'btn--ghost'}`} href="/admin/reviews?status=pending">
            Pending
          </a>
          <a className={`btn btn--sm ${searchParams.status === 'approved' ? '' : 'btn--ghost'}`} href="/admin/reviews?status=approved">
            Published
          </a>
        </div>
      </div>

      <ReviewManager
        reviews={reviews.map((review) => ({
          id: review.id,
          rating: review.rating,
          title: review.title,
          body: review.body,
          reviewerName: review.reviewerName,
          isApproved: review.isApproved,
          isVerifiedPurchase: review.isVerifiedPurchase,
          adminReply: review.adminReply,
          createdAt: review.createdAt.toISOString(),
          product: review.product,
          customer: review.customer,
        }))}
      />
    </>
  )
}
