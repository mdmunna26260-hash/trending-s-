import { requireAdmin } from '@/lib/auth'
import { createParcelForOrder, syncParcelStatus } from '@/lib/couriers/parcel-service'
import { handleError } from '@/lib/api-helpers'

/** Creates a Steadfast parcel for an order. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin('courier.manage')
    const parcel = await createParcelForOrder(params.id, { actorType: 'ADMIN', actorId: admin.id })
    return Response.json({ success: true, data: parcel })
  } catch (error) {
    return handleError(error)
  }
}

/** Refreshes parcel + order status from the courier. */
export async function PUT(_request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin('courier.manage')
    const { prisma } = await import('@/lib/db')
    const parcel = await prisma.parcel.findUnique({ where: { orderId: params.id } })
    if (!parcel) return Response.json({ success: false, error: 'No parcel for this order' }, { status: 404 })
    const updated = await syncParcelStatus(parcel.id, { actorId: admin.id })
    return Response.json({ success: true, data: updated })
  } catch (error) {
    return handleError(error)
  }
}
