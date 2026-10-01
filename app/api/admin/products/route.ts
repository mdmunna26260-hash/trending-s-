import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { slugify } from '@/lib/utils'
import { handleError } from '@/lib/api-helpers'

const variantSchema = z.object({
  name: z.string().min(1).max(60),
  colorFamily: z.string().max(60).optional().nullable(),
  hexColor: z.string().max(20).optional().nullable(),
  sku: z.string().max(60).optional().nullable(),
  priceOverride: z.number().int().min(0).optional().nullable(),
  stock: z.number().int().min(0).max(100000),
  lowStockAt: z.number().int().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
})

const productSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().max(200).optional(),
  brand: z.string().max(120).optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  details: z.string().max(4000).optional().nullable(),
  sku: z.string().max(80).optional().nullable(),
  price: z.number().int().min(0),
  compareAtPrice: z.number().int().min(0).optional().nullable(),
  costPrice: z.number().int().min(0).optional().nullable(),
  categoryId: z.string().min(1),
  position: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  colorGroup: z.string().max(80).optional().nullable(),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(300).optional().nullable(),
  weightGrams: z.number().int().min(0).optional(),
  variants: z.array(variantSchema).min(1, 'Add at least one size/variant'),
})

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin('products.manage')
    const body = productSchema.parse(await request.json())

    const slug = slugify(body.slug || body.name)
    const existing = await prisma.product.findUnique({ where: { slug } })
    if (existing) {
      return Response.json({ success: false, error: 'A product with this slug already exists' }, { status: 409 })
    }

    const product = await prisma.product.create({
      data: {
        name: body.name,
        slug,
        brand: body.brand || null,
        description: body.description || null,
        details: body.details || null,
        sku: body.sku || null,
        price: body.price,
        compareAtPrice: body.compareAtPrice ?? null,
        costPrice: body.costPrice ?? null,
        categoryId: body.categoryId,
        position: body.position ?? 0,
        isActive: body.isActive ?? true,
        isFeatured: body.isFeatured ?? false,
        colorGroup: body.colorGroup || null,
        seoTitle: body.seoTitle || null,
        seoDescription: body.seoDescription || null,
        weightGrams: body.weightGrams ?? 500,
        variants: {
          create: body.variants.map((variant, index) => ({
            name: variant.name,
            colorFamily: variant.colorFamily || null,
            hexColor: variant.hexColor || null,
            sku: variant.sku || null,
            priceOverride: variant.priceOverride ?? null,
            stock: variant.stock,
            lowStockAt: variant.lowStockAt ?? 3,
            isActive: variant.isActive ?? true,
            position: index,
          })),
        },
      },
      include: { variants: true },
    })

    await prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: admin.id,
        action: 'product.created',
        entity: 'Product',
        entityId: product.id,
        summary: product.name,
      },
    })

    return Response.json({ success: true, data: product })
  } catch (error) {
    return handleError(error)
  }
}
