import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { slugify } from '@/lib/utils'
import { handleError } from '@/lib/api-helpers'

const schema = z.object({
  name: z.string().min(2).max(120).optional(),
  slug: z.string().max(120).optional(),
  description: z.string().max(2000).optional().nullable(),
  imagePath: z.string().max(400).optional().nullable(),
  imageAlt: z.string().max(200).optional().nullable(),
  parentId: z.string().optional().nullable(),
  position: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin('categories.manage')
    const body = schema.parse(await request.json())

    const category = await prisma.category.update({
      where: { id: params.id },
      data: {
        ...body,
        ...(body.slug ? { slug: slugify(body.slug) } : {}),
      },
    })

    await prisma.auditLog.create({
      data: { actorType: 'ADMIN', actorId: admin.id, action: 'category.updated', entity: 'Category', entityId: params.id, summary: category.name },
    })

    return Response.json({ success: true, data: category })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin('categories.manage')
    const products = await prisma.product.count({ where: { categoryId: params.id, deletedAt: null } })
    if (products > 0) {
      return Response.json(
        { success: false, error: `Move or delete the ${products} product(s) in this category first` },
        { status: 409 },
      )
    }
    await prisma.category.delete({ where: { id: params.id } })
    await prisma.auditLog.create({
      data: { actorType: 'ADMIN', actorId: admin.id, action: 'category.deleted', entity: 'Category', entityId: params.id },
    })
    return Response.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
