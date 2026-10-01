import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleError } from '@/lib/api-helpers'

const schema = z.object({
  stock: z.number().int().min(0).max(100000),
  reason: z.string().max(200).optional(),
})

/** Sets absolute stock for a variant and records who changed it. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin('inventory.manage')
    const body = schema.parse(await request.json())

    const variant = await prisma.productVariant.update({
      where: { id: params.id },
      data: { stock: body.stock },
      include: { product: { select: { name: true } } },
    })

    await prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: admin.id,
        action: 'inventory.updated',
        entity: 'ProductVariant',
        entityId: params.id,
        summary: `${variant.product.name} — ${variant.name} → ${body.stock}${body.reason ? ` (${body.reason})` : ''}`,
      },
    })

    return Response.json({ success: true, data: variant })
  } catch (error) {
    return handleError(error)
  }
}
