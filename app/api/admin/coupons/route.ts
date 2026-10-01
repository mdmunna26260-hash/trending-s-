import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleError } from '@/lib/api-helpers'

const schema = z.object({
  code: z.string().min(3).max(40),
  type: z.enum(['PERCENT', 'FIXED', 'FREE_SHIPPING']).default('PERCENT'),
  value: z.number().int().min(0),
  description: z.string().max(300).optional().nullable(),
  minSubtotal: z.number().int().min(0).optional(),
  maxDiscount: z.number().int().min(0).optional().nullable(),
  usageLimit: z.number().int().min(0).optional().nullable(),
  perUserLimit: z.number().int().min(0).optional(),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin('coupons.manage')
    const body = schema.parse(await request.json())
    const code = body.code.toUpperCase().trim()

    if (await prisma.coupon.findUnique({ where: { code } })) {
      return Response.json({ success: false, error: 'That coupon code already exists' }, { status: 409 })
    }

    const coupon = await prisma.coupon.create({
      data: {
        code,
        type: body.type,
        value: body.value,
        description: body.description || null,
        minSubtotal: body.minSubtotal ?? 0,
        maxDiscount: body.maxDiscount ?? null,
        usageLimit: body.usageLimit ?? null,
        perUserLimit: body.perUserLimit ?? 1,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        isActive: body.isActive ?? true,
      },
    })

    await prisma.auditLog.create({
      data: { actorType: 'ADMIN', actorId: admin.id, action: 'coupon.created', entity: 'Coupon', entityId: coupon.id, summary: code },
    })

    return Response.json({ success: true, data: coupon })
  } catch (error) {
    return handleError(error)
  }
}
