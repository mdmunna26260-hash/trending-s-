import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSessionCustomer } from '@/lib/session'
import { getSettings } from '@/lib/settings'
import { handleError, rateLimitSafe } from '@/lib/api-helpers'

const schema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().min(10, 'Please write at least 10 characters').max(2000),
})

export async function POST(request: Request) {
  try {
    const customer = await getSessionCustomer()
    if (!customer) {
      return Response.json({ success: false, error: 'Please log in to write a review' }, { status: 401 })
    }

    const limited = await rateLimitSafe(`review:${customer.id}`, 5, 'hour')
    if (!limited.allowed) {
      return Response.json({ success: false, error: 'You have submitted several reviews already' }, { status: 429 })
    }

    const body = schema.parse(await request.json())

    const product = await prisma.product.findFirst({
      where: { id: body.productId, isActive: true, deletedAt: null },
    })
    if (!product) return Response.json({ success: false, error: 'Product not found' }, { status: 404 })

    // Only one review per customer per product.
    const existing = await prisma.review.findFirst({
      where: { productId: body.productId, customerId: customer.id },
    })
    if (existing) {
      return Response.json({ success: false, error: 'You have already reviewed this product' }, { status: 409 })
    }

    // A review counts as a verified purchase when the customer has a delivered
    // order containing this product.
    const purchase = await prisma.orderItem.findFirst({
      where: {
        productId: body.productId,
        order: { customerId: customer.id, status: 'DELIVERED' },
      },
      include: { order: true },
    })

    const settings = await getSettings()

    await prisma.review.create({
      data: {
        productId: body.productId,
        customerId: customer.id,
        orderId: purchase?.orderId ?? null,
        rating: body.rating,
        title: body.title?.trim() || null,
        body: body.body.trim(),
        reviewerName: customer.name || 'Verified buyer',
        isApproved: !settings.requireReviewApproval,
        isVerifiedPurchase: Boolean(purchase),
      },
    })

    return Response.json({
      success: true,
      data: {
        message: settings.requireReviewApproval
          ? 'Thank you — your review will appear once it is approved.'
          : 'Thank you! Your review is live.',
      },
    })
  } catch (error) {
    return handleError(error)
  }
}
