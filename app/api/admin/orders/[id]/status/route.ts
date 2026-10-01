import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { updateOrderStatus, ORDER_STATUS_FLOW } from '@/lib/orders'
import { handleError } from '@/lib/api-helpers'

const schema = z.object({
  status: z.enum([
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'PARCEL_CREATED',
    'RIDER_ASSIGNED',
    'DELIVERED',
    'CANCELLED',
    'RETURNED',
  ]),
  note: z.string().max(500).optional(),
  notify: z.boolean().optional(),
})

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin('orders.manage')
    const body = schema.parse(await request.json())

    const { prisma } = await import('@/lib/db')
    const order = await prisma.order.findUnique({ where: { id: params.id } })
    if (!order) return Response.json({ success: false, error: 'Order not found' }, { status: 404 })

    if (order.status !== body.status && !ORDER_STATUS_FLOW[order.status].includes(body.status as any)) {
      return Response.json(
        {
          success: false,
          error: `Cannot move from ${order.status} to ${body.status}. Allowed: ${ORDER_STATUS_FLOW[order.status].join(', ') || 'none'}`,
        },
        { status: 409 },
      )
    }

    const result = await updateOrderStatus(params.id, body.status, {
      actorType: 'ADMIN',
      actorId: admin.id,
      note: body.note,
      notify: body.notify !== false,
    })

    return Response.json({ success: true, data: result })
  } catch (error) {
    return handleError(error)
  }
}
