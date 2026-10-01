import { requireAdmin } from '@/lib/auth'
import { handleError } from '@/lib/api-helpers'
import { isSupportedImage, processAndStoreImage } from '@/lib/images'
import { prisma } from '@/lib/db'

const MAX_BYTES = 12 * 1024 * 1024

/**
 * Admin image upload. Converts to responsive WebP with Sharp and stores the
 * derivative set under /public/uploads. Never accepts non-image payloads.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin('products.manage')

    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return Response.json({ success: false, error: 'No file uploaded' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ success: false, error: 'Image must be smaller than 12MB' }, { status: 413 })
    }
    if (!isSupportedImage(file.type)) {
      return Response.json({ success: false, error: 'Unsupported image format' }, { status: 415 })
    }

    const folder = String(form.get('folder') || 'products').replace(/[^a-z0-9-]/gi, '') || 'products'
    const productId = form.get('productId') ? String(form.get('productId')) : null
    const buffer = Buffer.from(await file.arrayBuffer())
    const image = await processAndStoreImage(buffer, folder)

    let imageId: string | null = null
    if (productId) {
      const count = await prisma.productImage.count({ where: { productId } })
      const created = await prisma.productImage.create({
        data: {
          productId,
          path: image.path,
          width: image.width,
          height: image.height,
          altText: String(form.get('altText') || ''),
          position: count,
        },
      })
      imageId = created.id
    }

    return Response.json({ success: true, data: { ...image, imageId } })
  } catch (error) {
    return handleError(error)
  }
}
