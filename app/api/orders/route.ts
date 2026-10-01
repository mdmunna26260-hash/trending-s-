import { z } from 'zod'
import { createOrder, PAYMENT_METHODS } from '@/lib/orders'
import { getSessionCustomer } from '@/lib/session'
import { requestMeta } from '@/lib/http'
import { handleError, rateLimitSafe } from '@/lib/api-helpers'
import { signOrderLink } from '@/lib/auth'
import { trackEvent } from '@/lib/tracking'

const schema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(11).max(20),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().min(5).max(400),
  area: z.string().max(120).optional(),
  city: z.string().min(2).max(80),
  district: z.string().min(2).max(80),
  postcode: z.string().max(20).optional(),
  notes: z.string().max(1000).optional(),
  paymentMethod: z.enum(['COD', 'BKASH', 'NAGAD', 'ROCKET', 'CARD']),
  shippingAddressId: z.string().optional().nullable(),
  utm: z.record(z.string()).optional(),
  landingPage: z.string().optional(),
  eventId: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const limited = await rateLimitSafe(`order:${request.headers.get('x-forwarded-for') || 'local'}`, 10, 'hour')
    if (!limited.allowed) {
      return Response.json(
        { success: false, error: 'Too many orders placed from this connection. Please contact support.' },
        { status: 429 },
      )
    }

    const customer = await getSessionCustomer()
    const body = schema.parse(await request.json())

    if (!PAYMENT_METHODS.includes(body.paymentMethod)) {
      return Response.json({ success: false, error: 'Unsupported payment method' }, { status: 400 })
    }

    const { order } = await createOrder(
      {
        name: body.name,
        phone: body.phone,
        email: body.email || undefined,
        address: body.address,
        area: body.area,
        city: body.city,
        district: body.district,
        postcode: body.postcode,
        notes: body.notes,
        paymentMethod: body.paymentMethod,
        shippingAddressId: body.shippingAddressId ?? null,
        utm: body.utm,
        landingPage: body.landingPage,
        eventId: body.eventId,
      },
      customer?.id ?? null,
      requestMeta(request),
    )

    await trackEvent({
      eventName: 'InitiateCheckout',
      eventId: `${order.orderNumber}-checkout`,
      source: 'SERVER',
      orderId: order.id,
      email: order.customerEmail,
      phone: order.customerPhone,
      value: order.grandTotal,
      numItems: order.items.filter((item) => !item.isFreeGift).reduce((sum, item) => sum + item.quantity, 0),
    })

    return Response.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        grandTotal: order.grandTotal,
        trackingUrl: `/order/${order.orderNumber}`,
        trackingToken: signOrderLink(order.orderNumber, order.customerPhone),
      },
    })
  } catch (error) {
    return handleError(error)
  }
}
