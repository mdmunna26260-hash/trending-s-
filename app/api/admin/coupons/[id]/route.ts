import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleError } from '@/lib/api-helpers'

const schema = z.object({
  type: z.enum(['PERCENT', 'FIXED', 'FREE_SHIPPING']).optional(),
  value: z.number().int().min(0).optional(),
  description: z.string().max(300).optional().nullable(),
  minSubtotal: z.number().int().min(0).optional(),
  maxDiscount: z.number().int().min(0).optional().nullable(),
  usageLimit: z.number().int().min(0).optional().nullable(),
  perUserLimit: z.number().int().min(0).optional(),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin('coupons.manage')
    const body = schema.parse(await request.json())
    const coupon = await prisma.coupon.update({
      where: { id: params.id },
      data: {
        ...body,
        startsAt: body.startsAt ? new Date(body.startsAt) : body.startsAt === null ? null : undefined,
        endsAt: body.endsAt ? new Date(body.endsAt) : body.endsAt === null ? null : undefined,
      },
    })
    await prisma.auditLog.create({
      data: { actorType: 'ADMIN', actorId: admin.id, action: 'coupon.updated', entity: 'Coupon', entityId: params.id, summary: coupon.code },
    })
    return Response.json({ success: true, data: coupon })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin('coupons.manage')
    await prisma.coupon.delete({ where: { id: params.id } })
    await prisma.auditLog.create({
      data: { actorType: 'ADMIN', actorId: admin.id, action: 'coupon.deleted', entity: 'Coupon', entityId: params.id },
    })
    return Response.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
