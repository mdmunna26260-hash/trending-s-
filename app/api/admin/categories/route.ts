import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { slugify } from '@/lib/utils'
import { handleError } from '@/lib/api-helpers'

const schema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().max(120).optional(),
  description: z.string().max(2000).optional().nullable(),
  parentId: z.string().optional().nullable(),
  position: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
})

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin('categories.manage')
    const body = schema.parse(await request.json())
    const slug = slugify(body.slug || body.name)

    if (await prisma.category.findUnique({ where: { slug } })) {
      return Response.json({ success: false, error: 'That slug is already used' }, { status: 409 })
    }

    const category = await prisma.category.create({
      data: {
        name: body.name,
        slug,
        description: body.description || null,
        parentId: body.parentId || null,
        position: body.position ?? 0,
        isActive: body.isActive ?? true,
      },
    })

    await prisma.auditLog.create({
      data: { actorType: 'ADMIN', actorId: admin.id, action: 'category.created', entity: 'Category', entityId: category.id, summary: category.name },
    })

    return Response.json({ success: true, data: category })
  } catch (error) {
    return handleError(error)
  }
}
