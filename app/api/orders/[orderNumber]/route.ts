import { prisma } from '@/lib/db'
import { verifyOrderLink } from '@/lib/auth'
import { handleError } from '@/lib/api-helpers'

/**
 * Public order tracking. The order number alone is not enough — the caller
 * must present the matching phone number (form post) or a signed HMAC link
 * token, which prevents order enumeration.
 */
export async function GET(request: Request, { params }: { params: { orderNumber: string } }) {
  try {
    const url = new URL(request.url)
    const phone = url.searchParams.get('phone')?.replace(/[^\d+]/g, '')
    const token = url.searchParams.get('token')

    const order = await prisma.order.findUnique({
      where: { orderNumber: params.orderNumber },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        parcel: true,
        payments: true,
      },
    })
    if (!order) return Response.json({ success: false, error: 'Order not found' }, { status: 404 })

    const normalise = (value: string) => value.replace(/^\+?880/, '0').replace(/^880/, '0')
    const matchesPhone = phone && normalise(phone) === normalise(order.customerPhone)
    const signed = token ? verifyOrderLink(token) : null
    const signedOk = signed && signed.orderNumber === order.orderNumber && normalise(signed.phone) === normalise(order.customerPhone)

    if (!matchesPhone && !signedOk) {
      return Response.json(
        { success: false, error: 'Phone number does not match this order', code: 'PHONE_REQUIRED' },
        { status: 403 },
      )
    }

    return Response.json({ success: true, data: order })
  } catch (error) {
    return handleError(error)
  }
}
