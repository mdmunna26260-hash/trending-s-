import { addToCart, getCartView, setCartCoupon } from '@/lib/cart'
import { getSessionCustomer } from '@/lib/session'
import { handleError, rateLimitSafe } from '@/lib/api-helpers'

export async function GET() {
  try {
    const customer = await getSessionCustomer()
    const cart = await getCartView(customer?.id ?? null)
    return Response.json({ success: true, data: cart })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: Request) {
  try {
    const limited = await rateLimitSafe(`cart:${request.headers.get('x-forwarded-for') || 'local'}`, 60, 'minute')
    if (!limited.allowed) return Response.json({ success: false, error: 'Too many requests' }, { status: 429 })

    const customer = await getSessionCustomer()
    const body = await request.json()
    const cart = await addToCart(
      {
        productId: String(body.productId || ''),
        variantId: body.variantId ? String(body.variantId) : null,
        quantity: Number(body.quantity) || 1,
      },
      customer?.id ?? null,
    )
    return Response.json({ success: true, data: cart })
  } catch (error) {
    return handleError(error)
  }
}
