import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleError } from '@/lib/api-helpers'

/** Abandoned carts (idle 24h+) with customer and item details. */
export async function GET() {
  try {
    await requireAdmin('marketing.view')
    const carts = await prisma.cart.findMany({
      where: {
        items: { some: {} },
        lastActivityAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { lastActivityAt: 'asc' },
      take: 50,
      include: {
        customer: { select: { name: true, phone: true, email: true } },
        items: {
          include: {
            product: { select: { name: true, price: true } },
            variant: { select: { name: true } },
          },
        },
      },
    })

    const data = carts.map((cart) => ({
      id: cart.id,
      customer: cart.customer,
      couponCode: cart.couponCode,
      recoveryEmailSentAt: cart.recoveryEmailSentAt,
      lastActivityAt: cart.lastActivityAt.toISOString(),
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      total: cart.items.reduce((sum, item) => sum + (item.isFreeGift ? 0 : item.unitPrice * item.quantity), 0),
      items: cart.items.map((item) => ({
        name: item.product.name,
        variantName: item.variant?.name ?? null,
        quantity: item.quantity,
        lineTotal: item.isFreeGift ? 0 : item.unitPrice * item.quantity,
      })),
    }))

    return Response.json({ success: true, data })
  } catch (error) {
    return handleError(error)
  }
}
