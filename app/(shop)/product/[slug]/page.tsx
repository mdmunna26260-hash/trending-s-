import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ProductPurchase } from '@/components/ProductPurchase'
import { ProductCard } from '@/components/ProductCard'
import { ReviewSection } from '@/components/ReviewSection'
import { isLoggedInCustomer } from '@/lib/session'
import { getActiveCombos, getProductBySlug, getRelatedProducts, getSiblingProducts } from '@/lib/queries'

export const revalidate = 60

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug)
  if (!product) return { title: 'Product not found' }
  return {
    title: product.seoTitle || product.name,
    description: product.seoDescription || product.description || undefined,
    openGraph: {
      title: product.name,
      images: product.images[0] ? [{ url: product.images[0].path }] : undefined,
    },
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug)
  if (!product) notFound()

  const [siblings, related, combos, loggedIn] = await Promise.all([
    getSiblingProducts(product),
    getRelatedProducts(product.id, product.categoryId),
    getActiveCombos(),
    isLoggedInCustomer(),
  ])

  const relevantCombo = combos.find((combo) =>
    combo.items.some((item) => item.productId === product.id),
  )

  return (
    <div className="container section">
      <ProductPurchase
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          brand: product.brand,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          description: product.description,
          details: product.details,
          category: { name: product.category.name, slug: product.category.slug },
          images: product.images,
          variants: product.variants,
          reviews: product.reviews,
        }}
        siblings={siblings.map((sibling) => ({
          id: sibling.id,
          name: sibling.name,
          slug: sibling.slug,
          images: sibling.images,
        }))}
        isLoggedIn={loggedIn}
      />

      {relevantCombo ? (
        <div className="alert alert--info mt-5">
          <strong>Bundle offer:</strong> {relevantCombo.name} — add {relevantCombo.buyCount} qualifying pieces and get{' '}
          {relevantCombo.freeProduct.name} free. The gift is applied automatically in your bag.
        </div>
      ) : null}

      <ReviewSection
        productId={product.id}
        productName={product.name}
        reviews={product.reviews.map((review) => ({
          id: review.id,
          rating: review.rating,
          title: review.title,
          body: review.body,
          reviewerName: review.reviewerName || review.customer?.name || 'Verified buyer',
          isVerifiedPurchase: review.isVerifiedPurchase,
          adminReply: review.adminReply,
          createdAt: review.createdAt.toISOString(),
        }))}
        isLoggedIn={loggedIn}
      />

      {related.length ? (
        <section className="section">
          <div className="toolbar mb-5">
            <h2 className="display-2">You may also like</h2>
          </div>
          <div className="grid grid--products">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
