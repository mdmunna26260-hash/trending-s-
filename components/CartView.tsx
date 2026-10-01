'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useCart } from './CartProvider'
import { formatMoney, srcSetFor } from '@/lib/utils'
import { trackEvent } from '@/lib/analytics'

export function CartView({
  isLoggedIn,
  addresses,
}: {
  isLoggedIn: boolean
  addresses: Array<{ id: string; label: string; recipient: string; phone: string; address: string; area: string | null; city: string; district: string }>
}) {
  const { cart, loading, updateItem, removeItem, applyCoupon } = useCart()
  const [coupon, setCoupon] = useState('')
  const [couponMessage, setCouponMessage] = useState<string | null>(null)

  if (loading && !cart) {
    return (
      <div className="container section">
        <div className="skeleton" style={{ height: 320 }} />
      </div>
    )
  }

  const lines = cart?.lines ?? []
  const totals = cart?.totals

  if (!lines.length) {
    return (
      <div className="container section container--narrow">
        <h1 className="display-2">Your bag is empty</h1>
        <p className="lede mt-3">Have an account? Log in to see saved items. Otherwise, start with the shirts.</p>
        <div className="row gap-3 mt-5">
          <Link href="/shop" className="btn">
            Shop the collection
          </Link>
          {!isLoggedIn ? (
            <Link href="/account" className="btn btn--ghost">
              Log in
            </Link>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="container section">
      <h1 className="display-2 mb-5">Your bag</h1>

      <div className="cart-layout">
        <div>
          {lines.map((line) => (
            <div className="cart-line" key={line.id}>
              <Link href={`/product/${line.slug}`} className="cart-line__media">
                {line.imagePath ? (
                  <img
                    src={line.imagePath}
                    srcSet={srcSetFor(line.imagePath)}
                    sizes="104px"
                    alt={line.name}
                    loading="lazy"
                    width={104}
                    height={130}
                  />
                ) : null}
              </Link>

              <div className="stack" style={{ gap: '0.4rem' }}>
                {line.brand ? <div className="product-card__brand">{line.brand}</div> : null}
                <h2 style={{ fontSize: '1rem' }}>
                  <Link href={`/product/${line.slug}`}>{line.name}</Link>
                </h2>
                {line.variantName ? <div className="small muted">Size {line.variantName}</div> : null}
                {line.isFreeGift ? <span className="badge badge--ok">Free gift</span> : null}

                <div className="row gap-3 mt-2" style={{ flexWrap: 'wrap' }}>
                  <div className="stepper">
                    <button
                      type="button"
                      onClick={() => updateItem(line.id, line.quantity - 1)}
                      disabled={line.isFreeGift || line.quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="stepper__value">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateItem(line.id, line.quantity + 1)}
                      disabled={line.isFreeGift || line.quantity >= line.maxQuantity}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <button type="button" className="link-underline" onClick={() => removeItem(line.id)}>
                    Remove
                  </button>
                </div>
              </div>

              <div className="right">
                <div className="price">{line.isFreeGift ? 'Free' : formatMoney(line.lineTotal)}</div>
                {!line.isFreeGift && line.quantity > 1 ? (
                  <div className="small muted">{formatMoney(line.unitPrice)} each</div>
                ) : null}
                {!line.isFreeGift && line.stock <= 5 ? (
                  <div className="small" style={{ color: 'var(--berry-600)' }}>
                    Only {line.stock} left
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {/* ------------------------------------------------------- summary -- */}
        <aside className="surface pad stack" style={{ gap: '1rem' }}>
          <h2 className="label">Order summary</h2>

          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatMoney(totals?.subtotal ?? 0)}</span>
          </div>
          {totals?.discountTotal ? (
            <div className="summary-row" style={{ color: 'var(--brass-600)' }}>
              <span>Discount {totals.couponCode ? `(${totals.couponCode})` : ''}</span>
              <span>−{formatMoney(totals.discountTotal)}</span>
            </div>
          ) : null}
          <div className="summary-row">
            <span>Delivery</span>
            <span>{totals?.shippingTotal ? formatMoney(totals.shippingTotal) : 'Free'}</span>
          </div>
          <div className="summary-row">
            <span>COD handling</span>
            <span>{formatMoney(totals?.codFee ?? 0)}</span>
          </div>
          <div className="summary-row summary-row--total">
            <span>Total</span>
            <span>{formatMoney(totals?.grandTotal ?? 0)}</span>
          </div>

          {totals?.freeGifts ? (
            <p className="alert alert--ok">
              Bundle applied — {totals.freeGifts} free gift{totals.freeGifts > 1 ? 's' : ''} in your bag.
            </p>
          ) : null}

          <form
            className="stack"
            style={{ gap: '0.5rem' }}
            onSubmit={async (event) => {
              event.preventDefault()
              const result = await applyCoupon(coupon)
              setCouponMessage(result.ok ? 'Coupon applied' : result.message || 'Invalid coupon')
              if (result.ok) {
                setCoupon('')
                trackEvent('AddPromotion', { contentIds: [coupon] })
              }
            }}
          >
            <label className="label" htmlFor="coupon">
              Coupon code
            </label>
            <div className="row gap-2">
              <input
                id="coupon"
                className="input"
                value={coupon}
                onChange={(event) => setCoupon(event.target.value.toUpperCase())}
                placeholder="RUVIO10"
              />
              <button type="submit" className="btn btn--ghost btn--sm" disabled={!coupon}>
                Apply
              </button>
            </div>
            {couponMessage ? <p className="field__hint">{couponMessage}</p> : null}
            {totals?.couponCode ? (
              <button type="button" className="link-underline" onClick={() => applyCoupon(null)}>
                Remove coupon
              </button>
            ) : null}
          </form>

          <Link
            href="/checkout"
            className="btn btn--block"
            onClick={() => trackEvent('InitiateCheckout', { value: totals?.grandTotal, numItems: totals?.paidItemCount })}
          >
            Checkout · {formatMoney(totals?.grandTotal ?? 0)}
          </Link>

          <Link href="/shop" className="link-underline center">
            Continue shopping
          </Link>

          {addresses.length ? (
            <div className="stack" style={{ gap: '0.35rem' }}>
              <span className="label">Deliver to</span>
              {addresses.map((address) => (
                <span key={address.id} className="small muted">
                  {address.label} — {address.recipient}, {address.address}, {address.city}
                </span>
              ))}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
