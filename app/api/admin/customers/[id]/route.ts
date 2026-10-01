import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleError } from '@/lib/api-helpers'

const schema = z.object({
  isBlocked: z.boolean().optional(),
  blockReason: z.string().max(300).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  name: z.string().max(120).optional(),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin('customers.manage')
    const body = schema.parse(await request.json())
    const customer = await prisma.customer.update({ where: { id: params.id }, data: body })

    // Blocking a customer also invalidates every active session.
    if (body.isBlocked) {
      await prisma.customerSession.deleteMany({ where: { customerId: params.id } })
    }

    await prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: admin.id,
        action: body.isBlocked ? 'customer.blocked' : 'customer.updated',
        entity: 'Customer',
        entityId: params.id,
        summary: customer.phone,
      },
    })

    return Response.json({ success: true, data: customer })
  } catch (error) {
    return handleError(error)
  }
}
