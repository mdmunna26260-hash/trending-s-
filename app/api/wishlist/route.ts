import { prisma } from '@/lib/db'
import { getSessionCustomer } from '@/lib/session'
import { handleError } from '@/lib/api-helpers'

export async function GET() {
  try {
    const customer = await getSessionCustomer()
    if (!customer) return Response.json({ success: true, data: [] })
    const items = await prisma.wishlistItem.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            images: { orderBy: { position: 'asc' } },
            variants: { where: { isActive: true }, orderBy: { position: 'asc' } },
            category: { select: { name: true, slug: true } },
            reviews: { where: { isApproved: true }, select: { rating: true } },
          },
        },
      },
    })
    return Response.json({ success: true, data: items })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: Request) {
  try {
    const customer = await getSessionCustomer()
    if (!customer) return Response.json({ success: false, error: 'Please log in first' }, { status: 401 })

    const { productId } = await request.json()
    if (!productId) return Response.json({ success: false, error: 'productId is required' }, { status: 400 })

    const existing = await prisma.wishlistItem.findUnique({
      where: { customerId_productId: { customerId: customer.id, productId: String(productId) } },
    })

    if (existing) {
      await prisma.wishlistItem.delete({ where: { id: existing.id } })
      return Response.json({ success: true, data: { added: false } })
    }

    await prisma.wishlistItem.create({ data: { customerId: customer.id, productId: String(productId) } })
    return Response.json({ success: true, data: { added: true } })
  } catch (error) {
    return handleError(error)
  }
}
