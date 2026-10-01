import { sendAbandonedCartEmail } from '@/lib/orders'
import { requireAdmin } from '@/lib/auth'
import { handleError } from '@/lib/api-helpers'

/** Sends an abandoned-cart recovery email for a specific cart. */
export async function POST(request: Request) {
  try {
    await requireAdmin('marketing.view')
    const { cartId } = await request.json()
    if (!cartId) return Response.json({ success: false, error: 'cartId is required' }, { status: 400 })
    const result = await sendAbandonedCartEmail(String(cartId))
    return Response.json({ success: true, data: result })
  } catch (error) {
    return handleError(error)
  }
}
