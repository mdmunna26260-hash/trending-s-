'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDateTime, formatMoney, srcSetFor } from '@/lib/utils'

const STEPS = [
  { key: 'PENDING', label: 'Order placed', hint: 'We have received your order' },
  { key: 'CONFIRMED', label: 'Confirmed', hint: 'Verified by our team' },
  { key: 'PROCESSING', label: 'Processing', hint: 'Packed and labelled' },
  { key: 'PARCEL_CREATED', label: 'Parcel created', hint: 'Handed to the courier' },
  { key: 'RIDER_ASSIGNED', label: 'Rider assigned', hint: 'Out for delivery' },
  { key: 'DELIVERED', label: 'Delivered', hint: 'Enjoy your piece' },
]

interface OrderData {
  orderNumber: string
  status: string
  createdAt: string
  grandTotal: number
  subtotal: number
  discountTotal: number
  shippingTotal: number
  codFee: number
  paymentMethod: string
  paymentStatus: string
  customerName: string
  customerPhone: string
  shippingAddress: string
  area: string | null
  city: string
  district: string
  items: Array<{
    id: string
    name: string
    variantName: string | null
    quantity: number
    lineTotal: number
    isFreeGift: boolean
    imagePath: string | null
  }>
  statusHistory: Array<{ status: string; note: string | null; createdAt: string; actorType: string }>
  parcel: {
    consignmentId: string | null
    trackingCode: string | null
    status: string
    riderName: string | null
    riderPhone: string | null
    provider: string
  } | null
}

export function OrderTracker({
  orderNumber,
  initialToken,
  justPlaced,
}: {
  orderNumber: string
  initialToken: string | null
  justPlaced: boolean
}) {
  const [token, setToken] = useState<string | null>(initialToken)
  const [phone, setPhone] = useState('')
  const [order, setOrder] = useState<OrderData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(initialToken))

  const load = async (params: { phone?: string; token?: string }) => {
    setLoading(true)
    setError(null)
    try {
      const search = new URLSearchParams()
      if (params.token) search.set('token', params.token)
      if (params.phone) search.set('phone', params.phone)
      const response = await fetch(`/api/orders/${orderNumber}?${search.toString()}`, { cache: 'no-store' })
      const payload = await response.json()
      if (payload.success) {
        setOrder(payload.data)
        if (params.token) setToken(params.token)
      } else {
        setError(payload.error)
        setOrder(null)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialToken) load({ token: initialToken })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!order) {
    return (
      <div className="container section container--narrow">
        <div className="eyebrow">Order tracking</div>
        <h1 className="display-2 mt-2">{orderNumber}</h1>
        {justPlaced ? (
          <p className="alert alert--ok mt-4">
            Thank you — your order has been placed. Enter the phone number you used to see live status.
          </p>
        ) : null}

        <form
          className="surface pad stack mt-5"
          style={{ gap: '1rem' }}
          onSubmit={(event) => {
            event.preventDefault()
            load({ phone })
          }}
        >
          <div className="field">
            <label htmlFor="track-phone">Phone number used for this order</label>
            <input
              id="track-phone"
              className="input"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="01XXXXXXXXX"
              inputMode="tel"
              required
            />
            <span className="field__hint">We ask for this so only you can see your order details.</span>
          </div>
          {error ? <p className="alert alert--danger">{error}</p> : null}
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Checking…' : 'Track order'}
          </button>
        </form>
      </div>
    )
  }

  const currentIndex = STEPS.findIndex((step) => step.key === order.status)
  const isCancelled = order.status === 'CANCELLED' || order.status === 'RETURNED'
  const progressIndex = isCancelled ? -1 : currentIndex

  return (
    <div className="container section">
      <div className="eyebrow">Order {order.orderNumber}</div>
      <div className="toolbar mt-2 mb-5">
        <h1 className="display-2">
          {isCancelled ? (order.status === 'CANCELLED' ? 'Order cancelled' : 'Order returned') : STEPS[progressIndex]?.label}
        </h1>
        <span className={`badge ${order.status === 'DELIVERED' ? 'badge--ok' : isCancelled ? 'badge--danger' : 'badge--info'}`}>
          {order.status.replace(/_/g, ' ').toLowerCase()}
        </span>
      </div>

      {justPlaced ? (
        <p className="alert alert--ok mb-5">
          Order placed successfully. We will confirm it by phone shortly — you will also receive an email with your
          invoice.
        </p>
      ) : null}

      <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '2rem' }}>
        <div className="surface pad">
          <h2 className="label mb-4">Progress</h2>
          <div className="timeline">
            {STEPS.map((step, index) => {
              const done = !isCancelled && index < progressIndex
              const current = !isCancelled && index === progressIndex
              return (
                <div
                  key={step.key}
                  className={`timeline__step ${done ? 'timeline__step--done' : ''} ${current ? 'timeline__step--current' : ''}`}
                >
                  <span className="timeline__dot">{done ? '✓' : index + 1}</span>
                  <div>
                    <div style={{ fontWeight: current ? 600 : 400 }}>{step.label}</div>
                    <div className="small muted">{step.hint}</div>
                    {current && order.statusHistory.length ? (
                      <div className="small muted mt-2">
                        {formatDateTime(
                          [...order.statusHistory].reverse().find((entry) => entry.status === order.status)?.createdAt ||
                            order.createdAt,
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>

          {order.parcel ? (
            <div className="alert alert--info mt-4">
              <strong>Courier ({order.parcel.provider}):</strong>{' '}
              {order.parcel.trackingCode ? `Tracking ${order.parcel.trackingCode} · ` : ''}
              {order.parcel.consignmentId ? `Consignment ${order.parcel.consignmentId} · ` : ''}
              status {order.parcel.status.replace(/_/g, ' ').toLowerCase()}
              {order.parcel.riderName ? ` · Rider ${order.parcel.riderName} (${order.parcel.riderPhone})` : ''}
            </div>
          ) : null}

          {order.statusHistory.length ? (
            <details className="mt-4">
              <summary className="label">Full history</summary>
              <ul className="stack mt-3" style={{ gap: '0.5rem' }}>
                {order.statusHistory.map((entry, index) => (
                  <li key={index} className="small muted">
                    {formatDateTime(entry.createdAt)} — {entry.status.replace(/_/g, ' ').toLowerCase()}
                    {entry.note ? ` · ${entry.note}` : ''}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>

        <div className="stack" style={{ gap: '1.5rem' }}>
          <div className="surface pad">
            <h2 className="label mb-3">Items</h2>
            <div className="stack" style={{ gap: '0.75rem' }}>
              {order.items.map((item) => (
                <div key={item.id} className="row gap-3">
                  {item.imagePath ? (
                    <img
                      src={item.imagePath}
                      srcSet={srcSetFor(item.imagePath)}
                      sizes="64px"
                      alt={item.name}
                      width={64}
                      height={80}
                      loading="lazy"
                      style={{ objectFit: 'cover', borderRadius: 2 }}
                    />
                  ) : null}
                  <div className="grow">
                    <div style={{ fontSize: '0.95rem' }}>
                      {item.name}
                      {item.variantName ? ` · ${item.variantName}` : ''}
                    </div>
                    <div className="small muted">Qty {item.quantity}</div>
                  </div>
                  <div className="small">{item.isFreeGift ? 'Free' : formatMoney(item.lineTotal)}</div>
                </div>
              ))}
            </div>

            <hr className="divider mt-4" />
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatMoney(order.subtotal)}</span>
            </div>
            {order.discountTotal ? (
              <div className="summary-row">
                <span>Discount</span>
                <span>−{formatMoney(order.discountTotal)}</span>
              </div>
            ) : null}
            <div className="summary-row">
              <span>Delivery</span>
              <span>{order.shippingTotal ? formatMoney(order.shippingTotal) : 'Free'}</span>
            </div>
            {order.codFee ? (
              <div className="summary-row">
                <span>COD handling</span>
                <span>{formatMoney(order.codFee)}</span>
              </div>
            ) : null}
            <div className="summary-row summary-row--total">
              <span>Total ({order.paymentMethod})</span>
              <span>{formatMoney(order.grandTotal)}</span>
            </div>
          </div>

          <div className="surface pad">
            <h2 className="label mb-3">Delivering to</h2>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
              {order.customerName}
              <br />
              {order.shippingAddress}
              <br />
              {order.area ? `${order.area}, ` : ''}
              {order.city}, {order.district}
              <br />
              {order.customerPhone}
            </p>
            <Link href="/shop" className="link-underline mt-4" style={{ display: 'inline-block' }}>
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
