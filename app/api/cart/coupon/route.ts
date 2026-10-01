import { setCartCoupon } from '@/lib/cart'
import { getSessionCustomer } from '@/lib/session'
import { handleError, rateLimitSafe } from '@/lib/api-helpers'

export async function POST(request: Request) {
  try {
    const limited = await rateLimitSafe(`coupon:${request.headers.get('x-forwarded-for') || 'local'}`, 20, 'minute')
    if (!limited.allowed) return Response.json({ success: false, error: 'Too many attempts' }, { status: 429 })

    const customer = await getSessionCustomer()
    const body = await request.json()
    const code = body.code ? String(body.code) : null
    const cart = await setCartCoupon(code, customer?.id ?? null)
    return Response.json({ success: true, data: cart })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE() {
  try {
    const customer = await getSessionCustomer()
    const cart = await setCartCoupon(null, customer?.id ?? null)
    return Response.json({ success: true, data: cart })
  } catch (error) {
    return handleError(error)
  }
}
