import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleError } from '@/lib/api-helpers'

const schema = z.object({
  isApproved: z.boolean().optional(),
  adminReply: z.string().max(1000).optional().nullable(),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin('reviews.manage')
    const body = schema.parse(await request.json())
    const review = await prisma.review.update({ where: { id: params.id }, data: body })
    await prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: admin.id,
        action: body.isApproved === false ? 'review.rejected' : 'review.updated',
        entity: 'Review',
        entityId: params.id,
      },
    })
    return Response.json({ success: true, data: review })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin('reviews.manage')
    await prisma.review.delete({ where: { id: params.id } })
    await prisma.auditLog.create({
      data: { actorType: 'ADMIN', actorId: admin.id, action: 'review.deleted', entity: 'Review', entityId: params.id },
    })
    return Response.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
