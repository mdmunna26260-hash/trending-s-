'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from './CartProvider'
import { Stars } from './Stars'
import { discountPercent, formatMoney, srcSetFor } from '@/lib/utils'
import { trackEvent } from '@/lib/analytics'

interface Variant {
  id: string
  name: string
  stock: number
  colorFamily: string | null
  hexColor: string | null
  priceOverride: number | null
}

interface ProductPurchaseProps {
  product: {
    id: string
    name: string
    slug: string
    brand: string | null
    price: number
    compareAtPrice: number | null
    description: string | null
    details: string | null
    category: { name: string; slug: string }
    images: Array<{ path: string; altText: string | null; width: number | null; height: number | null }>
    variants: Variant[]
    reviews: Array<{ rating: number }>
  }
  siblings: Array<{ id: string; name: string; slug: string; images: Array<{ path: string }> }>
  isLoggedIn: boolean
}

export function ProductPurchase({ product, siblings, isLoggedIn }: ProductPurchaseProps) {
  const { addItem } = useCart()
  const router = useRouter()
  const [activeImage, setActiveImage] = useState(0)
  const [variantId, setVariantId] = useState<string | null>(
    product.variants.find((variant) => variant.stock > 0)?.id ?? product.variants[0]?.id ?? null,
  )
  const [quantity, setQuantity] = useState(1)
  const [status, setStatus] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [buying, setBuying] = useState(false)
  const [justAdded, setJustAdded] = useState(false)

  const variant = useMemo(
    () => product.variants.find((entry) => entry.id === variantId) ?? null,
    [product.variants, variantId],
  )
  const unitPrice = variant?.priceOverride ?? product.price
  const discount = discountPercent(product.price, product.compareAtPrice)
  const rating = product.reviews.length
    ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
    : 0
  const outOfStock = !variant || variant.stock <= 0

  useEffect(() => {
    trackEvent('ViewContent', {
      value: unitPrice,
      contentIds: [product.id],
      contentType: 'product',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id])

  const handleAdd = async () => {
    if (!variantId || adding) return
    setAdding(true)
    const result = await addItem({ productId: product.id, variantId, quantity })
    setAdding(false)
    if (result.ok) {
      setJustAdded(true)
      setStatus(`${quantity} × ${product.name} added to your cart`)
      trackEvent('AddToCart', {
        value: unitPrice * quantity,
        contentIds: [product.id],
        contentType: 'product',
        numItems: quantity,
      })
      window.setTimeout(() => setJustAdded(false), 4000)
    } else {
      setJustAdded(false)
      setStatus(result.message || 'Could not add to cart')
    }
  }

  /** Adds the current selection and goes straight to checkout. */
  const handleBuyNow = async () => {
    if (!variantId || buying) return
    setBuying(true)
    const result = await addItem({ productId: product.id, variantId, quantity })
    setBuying(false)
    if (result.ok) {
      trackEvent('AddToCart', {
        value: unitPrice * quantity,
        contentIds: [product.id],
        contentType: 'product',
        numItems: quantity,
      })
      router.push('/checkout')
      return
    }
    setStatus(result.message || 'Could not add to cart')
  }

  const toggleWishlist = async () => {
    const response = await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id }),
    })
    const payload = await response.json()
    setStatus(payload.success ? (payload.data.added ? 'Saved to wishlist' : 'Removed from wishlist') : payload.error)
    setTimeout(() => setStatus(null), 3000)
  }

  return (
    <div className="product-layout">
      {/* --------------------------------------------------------- gallery -- */}
      <div>
        <div className="gallery__main">
          {product.images[activeImage] ? (
            <img
              src={product.images[activeImage].path}
              srcSet={srcSetFor(product.images[activeImage].path)}
              sizes="(max-width: 960px) 100vw, 55vw"
              alt={product.images[activeImage].altText || product.name}
              width={product.images[activeImage].width ?? 1200}
              height={product.images[activeImage].height ?? 1500}
              fetchPriority="high"
              decoding="async"
            />
          ) : (
            <div className="skeleton" style={{ width: '100%', height: '100%' }} />
          )}
        </div>

        {product.images.length > 1 ? (
          <div className="gallery__thumbs">
            {product.images.map((image, index) => (
              <button
                key={image.path}
                type="button"
                className="gallery__thumb"
                aria-pressed={index === activeImage}
                aria-label={`View image ${index + 1}`}
                onClick={() => setActiveImage(index)}
              >
                <img src={image.path} alt="" loading="lazy" decoding="async" width={72} height={72} />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* ------------------------------------------------------------ info -- */}
      <div className="product-layout__info stack" style={{ gap: '1.25rem' }}>
        <nav className="small muted" aria-label="Breadcrumb">
          <a href="/">Home</a> / <a href={`/category/${product.category.slug}`}>{product.category.name}</a> /{' '}
          <span>{product.name}</span>
        </nav>

        <div>
          {product.brand ? <div className="eyebrow">{product.brand}</div> : null}
          <h1 className="display-2 mt-2">{product.name}</h1>
          <div className="row gap-3 mt-3">
            {rating ? <Stars value={rating} size={15} showValue /> : null}
            <span className="small muted">{product.reviews.length} verified reviews</span>
          </div>
        </div>

        <div className="row gap-3" style={{ alignItems: 'baseline' }}>
          <span className="price" style={{ fontSize: '1.6rem' }}>
            {formatMoney(unitPrice)}
          </span>
          {product.compareAtPrice ? (
            <>
              <span className="strike">{formatMoney(product.compareAtPrice)}</span>
              {discount ? <span className="badge badge--danger">Save {discount}%</span> : null}
            </>
          ) : null}
        </div>

        {product.description ? <p className="lede">{product.description}</p> : null}

        {/* ------------------------------------------------------- variants -- */}
        {product.variants.length ? (
          <div className="stack" style={{ gap: '0.6rem' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="label">Size</span>
              {variant ? (
                <span className="small muted">
                  {variant.stock > 0 ? `${variant.stock} in stock` : 'Out of stock'}
                </span>
              ) : null}
            </div>
            <div className="chip-row">
              {product.variants.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="chip"
                  aria-pressed={entry.id === variantId}
                  disabled={entry.stock <= 0}
                  onClick={() => setVariantId(entry.id)}
                >
                  {entry.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* ---------------------------------------------------- siblings ---- */}
        {siblings.length ? (
          <div className="stack" style={{ gap: '0.6rem' }}>
            <span className="label">More colours</span>
            <div className="row gap-3">
              {siblings.map((sibling) => (
                <a
                  key={sibling.id}
                  href={`/product/${sibling.slug}`}
                  className="gallery__thumb"
                  style={{ width: 56, opacity: 1, borderRadius: 4 }}
                  title={sibling.name}
                >
                  {sibling.images[0] ? (
                    <img src={sibling.images[0].path} alt={sibling.name} loading="lazy" width={56} height={56} />
                  ) : null}
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {/* ------------------------------------------------------ purchase -- */}
        <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
          <div className="stepper" aria-label="Quantity">
            <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity <= 1}>
              −
            </button>
            <span className="stepper__value">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.min(variant?.stock ?? 10, value + 1))}
              disabled={quantity >= (variant?.stock ?? 1)}
            >
              +
            </button>
          </div>

          <button
            type="button"
            className={justAdded ? 'btn btn--lg btn--ok grow' : 'btn btn--lg grow'}
            onClick={handleAdd}
            disabled={outOfStock || adding || buying}
            style={{ flex: '1 1 200px' }}
          >
            {adding ? 'Adding…' : outOfStock ? 'Sold out' : justAdded ? '✓ Added to cart' : 'Add to cart'}
          </button>

          <button
            type="button"
            className="btn btn--lg btn--ghost"
            onClick={handleBuyNow}
            disabled={outOfStock || adding || buying}
            style={{ flex: '1 1 140px' }}
          >
            {buying ? 'Adding…' : 'Buy now'}
          </button>

          {isLoggedIn ? (
            <button type="button" className="btn btn--ghost btn--lg" onClick={toggleWishlist} aria-label="Save to wishlist">
              ♡
            </button>
          ) : null}
        </div>

        {status ? (
          <p className={justAdded ? 'alert alert--ok' : 'alert alert--warn'} role="status">
            {status}
            {justAdded ? (
              <>
                {' — '}
                <Link href="/cart" className="link-underline">
                  view cart
                </Link>
              </>
            ) : null}
          </p>
        ) : null}

        <ul className="stack small muted" style={{ gap: '0.4rem' }}>
          <li>· Cash on delivery available nationwide</li>
          <li>· Dhaka dispatch within 24 hours, courier delivery in 24–72 hours</li>
          <li>· 7-day exchange on unworn items with tags</li>
        </ul>

        {/* ------------------------------------------------------ accordion -- */}
        <div className="accordion mt-4">
          <details className="accordion__item" open>
            <summary className="accordion__trigger">
              Details &amp; fabric
              <span aria-hidden>+</span>
            </summary>
            <div className="accordion__body">{product.details || 'Product details coming soon.'}</div>
          </details>
          <details className="accordion__item">
            <summary className="accordion__trigger">
              Delivery &amp; returns
              <span aria-hidden>+</span>
            </summary>
            <div className="accordion__body">
              Inside Dhaka ৳60, outside Dhaka ৳120. Free delivery on orders over ৳2,000. Orders placed before 3pm are
              dispatched the same day. Exchanges accepted within 7 days on unworn items with tags attached.
            </div>
          </details>
          <details className="accordion__item">
            <summary className="accordion__trigger">
              Sizing
              <span aria-hidden>+</span>
            </summary>
            <div className="accordion__body">
              True to size. Between sizes? Take the larger for a relaxed fit. Measurements are listed in centimetres on
              request — message us on WhatsApp with the product name and we will send the chart.
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}
