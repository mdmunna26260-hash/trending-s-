import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { slugify } from '@/lib/utils'
import { handleError } from '@/lib/api-helpers'

const patchSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  slug: z.string().max(200).optional(),
  brand: z.string().max(120).optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  details: z.string().max(4000).optional().nullable(),
  price: z.number().int().min(0).optional(),
  compareAtPrice: z.number().int().min(0).optional().nullable(),
  costPrice: z.number().int().min(0).optional().nullable(),
  categoryId: z.string().min(1).optional(),
  position: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  colorGroup: z.string().max(80).optional().nullable(),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(300).optional().nullable(),
  weightGrams: z.number().int().min(0).optional(),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1).max(60),
        colorFamily: z.string().max(60).optional().nullable(),
        hexColor: z.string().max(20).optional().nullable(),
        sku: z.string().max(60).optional().nullable(),
        priceOverride: z.number().int().min(0).optional().nullable(),
        stock: z.number().int().min(0).max(100000),
        lowStockAt: z.number().int().min(0).max(100).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .optional(),
  images: z
    .array(
      z.object({
        id: z.string().optional(),
        path: z.string().max(400),
        altText: z.string().max(200).optional().nullable(),
        position: z.number().int().min(0).optional(),
      }),
    )
    .optional(),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin('products.manage')
    const body = patchSchema.parse(await request.json())

    const product = await prisma.product.findUnique({ where: { id: params.id } })
    if (!product) return Response.json({ success: false, error: 'Product not found' }, { status: 404 })

    const { variants, images, ...fields } = body
    const slug = fields.slug ? slugify(fields.slug) : undefined

    const updated = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: params.id },
        data: {
          ...fields,
          ...(slug ? { slug } : {}),
        },
      })

      if (variants) {
        const existing = await tx.productVariant.findMany({ where: { productId: params.id } })
        const keepIds = variants.filter((variant) => variant.id).map((variant) => variant.id!)

        for (const variant of existing) {
          if (!keepIds.includes(variant.id)) await tx.productVariant.delete({ where: { id: variant.id } })
        }
        for (const [index, variant] of variants.entries()) {
          const data = {
            name: variant.name,
            colorFamily: variant.colorFamily || null,
            hexColor: variant.hexColor || null,
            sku: variant.sku || null,
            priceOverride: variant.priceOverride ?? null,
            stock: variant.stock,
            lowStockAt: variant.lowStockAt ?? 3,
            isActive: variant.isActive ?? true,
            position: index,
          }
          if (variant.id) {
            await tx.productVariant.update({ where: { id: variant.id }, data })
          } else {
            await tx.productVariant.create({ data: { ...data, productId: params.id } })
          }
        }
      }

      if (images) {
        const existing = await tx.productImage.findMany({ where: { productId: params.id } })
        const keepIds = images.filter((image) => image.id).map((image) => image.id!)
        for (const image of existing) {
          if (!keepIds.includes(image.id)) await tx.productImage.delete({ where: { id: image.id } })
        }
        for (const [index, image] of images.entries()) {
          const data = { path: image.path, altText: image.altText || null, position: image.position ?? index }
          if (image.id) {
            await tx.productImage.update({ where: { id: image.id }, data })
          } else {
            await tx.productImage.create({ data: { ...data, productId: params.id } })
          }
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id: params.id },
        include: { variants: true, images: true, category: true },
      })
    })

    await prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: admin.id,
        action: 'product.updated',
        entity: 'Product',
        entityId: params.id,
        summary: updated.name,
      },
    })

    return Response.json({ success: true, data: updated })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin('products.manage')

    // Soft delete keeps historical order items intact.
    await prisma.product.update({
      where: { id: params.id },
      data: { deletedAt: new Date(), isActive: false },
    })

    await prisma.auditLog.create({
      data: { actorType: 'ADMIN', actorId: admin.id, action: 'product.deleted', entity: 'Product', entityId: params.id },
    })

    return Response.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
