import { removeCartItem, updateCartItem } from '@/lib/cart'
import { getSessionCustomer } from '@/lib/session'
import { handleError } from '@/lib/api-helpers'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const customer = await getSessionCustomer()
    const body = await request.json()
    const cart = await updateCartItem(params.id, Number(body.quantity) || 0, customer?.id ?? null)
    return Response.json({ success: true, data: cart })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const customer = await getSessionCustomer()
    const cart = await removeCartItem(params.id, customer?.id ?? null)
    return Response.json({ success: true, data: cart })
  } catch (error) {
    return handleError(error)
  }
}
