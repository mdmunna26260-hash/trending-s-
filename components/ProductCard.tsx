import Link from 'next/link'
import { discountPercent, formatMoney, srcSetFor } from '@/lib/utils'
import { Stars } from './Stars'

interface ProductCardProps {
  product: {
    id: string
    name: string
    slug: string
    brand: string | null
    price: number
    compareAtPrice: number | null
    isFeatured: boolean
    createdAt: Date
    images: Array<{ path: string; width: number | null; height: number | null; altText: string | null }>
    variants: Array<{ id: string; name: string; stock: number }>
    reviews: Array<{ rating: number }>
    category?: { name: string; slug: string } | null
  }
  eager?: boolean
}

export function ProductCard({ product, eager = false }: ProductCardProps) {
  const image = product.images[0]
  const inStock = product.variants.some((variant) => variant.stock > 0)
  const rating = product.reviews.length
    ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
    : 0
  const discount = discountPercent(product.price, product.compareAtPrice)
  const isNew = Date.now() - new Date(product.createdAt).getTime() < 1000 * 60 * 60 * 24 * 30

  return (
    <article className="product-card">
      <Link href={`/product/${product.slug}`} className="product-card__media">
        {image ? (
          <img
            src={image.path}
            srcSet={srcSetFor(image.path)}
            sizes="(max-width: 720px) 50vw, (max-width: 1080px) 33vw, 25vw"
            alt={image.altText || product.name}
            width={image.width ?? 800}
            height={image.height ?? 1000}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={eager ? 'high' : 'auto'}
          />
        ) : (
          <div className="skeleton" style={{ width: '100%', height: '100%' }} />
        )}

        <div className="row" style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', gap: '0.35rem' }}>
          {discount ? <span className="flag flag--berry">−{discount}%</span> : null}
          {isNew ? <span className="flag">New</span> : null}
          {product.isFeatured ? <span className="flag flag--brass">Featured</span> : null}
          {!inStock ? <span className="flag flag--ink">Sold out</span> : null}
        </div>
      </Link>

      <div className="stack" style={{ gap: '0.3rem' }}>
        {product.brand ? <div className="product-card__brand">{product.brand}</div> : null}
        <h3 className="product-card__name">
          <Link href={`/product/${product.slug}`}>{product.name}</Link>
        </h3>
        <div className="product-card__price">
          <span className="price">{formatMoney(product.price)}</span>
          {product.compareAtPrice ? <span className="strike small">{formatMoney(product.compareAtPrice)}</span> : null}
        </div>
        <div className="row" style={{ gap: '0.5rem' }}>
          {rating ? <Stars value={rating} size={13} /> : null}
          {product.reviews.length ? <span className="small muted">({product.reviews.length})</span> : null}
          {product.category ? (
            <Link href={`/category/${product.category.slug}`} className="small muted" style={{ marginLeft: 'auto' }}>
              {product.category.name}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  )
}
