import { CouponManager } from '@/components/admin/CouponForm'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function AdminCouponsPage() {
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { redemptions: true } } },
  })

  return (
    <>
      <div className="admin__topbar">
        <div>
          <div className="eyebrow">Catalogue</div>
          <h1 className="page-title mt-2">Coupons &amp; discounts</h1>
        </div>
        <span className="badge">{coupons.length} coupons</span>
      </div>

      <CouponManager
        coupons={coupons.map((coupon) => ({
          id: coupon.id,
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          description: coupon.description,
          minSubtotal: coupon.minSubtotal,
          maxDiscount: coupon.maxDiscount,
          usageLimit: coupon.usageLimit,
          usedCount: coupon.usedCount,
          perUserLimit: coupon.perUserLimit,
          startsAt: coupon.startsAt?.toISOString() ?? null,
          endsAt: coupon.endsAt?.toISOString() ?? null,
          isActive: coupon.isActive,
          _count: { redemptions: coupon._count.redemptions },
        }))}
      />
    </>
  )
}
