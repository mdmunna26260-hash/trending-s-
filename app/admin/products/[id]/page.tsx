import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ProductForm } from '@/components/admin/ProductForm'
import { prisma } from '@/lib/db'
import { formatMoney } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { variants: { orderBy: { position: 'asc' } }, images: { orderBy: { position: 'asc' } }, category: true },
  })
  if (!product) notFound()

  const categories = await prisma.category.findMany({ orderBy: { position: 'asc' } })
  const stock = product.variants.reduce((sum, variant) => sum + variant.stock, 0)

  return (
    <>
      <div className="admin__topbar">
        <div>
          <div className="eyebrow">
            <Link href="/admin/products">Products</Link> / {product.slug}
          </div>
          <h1 className="page-title mt-2">{product.name}</h1>
          <p className="small muted mt-2">
            {formatMoney(product.price)} · {stock} in stock ·{' '}
            <Link href={`/product/${product.slug}`} className="link-underline">
              view in storefront
            </Link>
          </p>
        </div>
        <Link href="/admin/products/new" className="btn btn--ghost btn--sm">
          Add another
        </Link>
      </div>

      <ProductForm
        mode="edit"
        categories={categories}
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          brand: product.brand,
          description: product.description,
          details: product.details,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          costPrice: product.costPrice,
          categoryId: product.categoryId,
          position: product.position,
          isActive: product.isActive,
          isFeatured: product.isFeatured,
          colorGroup: product.colorGroup,
          seoTitle: product.seoTitle,
          seoDescription: product.seoDescription,
          weightGrams: product.weightGrams,
          variants: product.variants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            colorFamily: variant.colorFamily || '',
            hexColor: variant.hexColor || '',
            sku: variant.sku || '',
            priceOverride: variant.priceOverride ? String(variant.priceOverride / 100) : '',
            stock: variant.stock,
            lowStockAt: variant.lowStockAt,
            isActive: variant.isActive,
          })),
          images: product.images.map((image) => ({ id: image.id, path: image.path, altText: image.altText || '' })),
        }}
      />
    </>
  )
}
