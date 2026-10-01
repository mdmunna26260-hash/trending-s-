'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from './CartProvider'
import { cartHeaders } from '@/lib/cart-token'
import { formatMoney } from '@/lib/utils'
import { trackEvent } from '@/lib/analytics'

interface Address {
  id: string
  label: string
  recipient: string
  phone: string
  address: string
  area: string | null
  city: string
  district: string
  postcode: string | null
}

const DISTRICTS = [
  'Dhaka',
  'Chattogram',
  'Sylhet',
  'Khulna',
  'Rajshahi',
  'Rangpur',
  'Barishal',
  'Mymensingh',
  'Cumilla',
  'Gazipur',
  'Narayanganj',
  'Tangail',
  'Jashore',
  'Bogura',
  'Dinajpur',
]

export function CheckoutForm({
  isLoggedIn,
  customer,
  addresses,
  settings,
}: {
  isLoggedIn: boolean
  customer: { name: string | null; phone: string; email: string | null } | null
  addresses: Address[]
  settings: {
    shippingInsideDhaka: number
    shippingOutsideDhaka: number
    freeShippingThreshold: number
    supportPhone: string
  }
}) {
  const router = useRouter()
  const { cart, loading } = useCart()

  const [form, setForm] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: '',
    area: '',
    city: '',
    district: 'Dhaka',
    postcode: '',
    notes: '',
    paymentMethod: 'COD',
    addressId: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [utm, setUtm] = useState<Record<string, string>>({})

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const collected: Record<string, string> = {}
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      const value = params.get(key)
      if (value) collected[key] = value
    }
    setUtm(collected)
  }, [])

  const defaultAddress = useMemo(() => addresses.find((address) => address.id === form.addressId) ?? addresses[0], [addresses, form.addressId])

  useEffect(() => {
    if (defaultAddress && !form.address) {
      setForm((current) => ({
        ...current,
        name: current.name || defaultAddress.recipient,
        phone: current.phone || defaultAddress.phone,
        address: defaultAddress.address,
        area: defaultAddress.area || '',
        city: defaultAddress.city,
        district: defaultAddress.district,
        postcode: defaultAddress.postcode || '',
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultAddress])

  const totals = cart?.totals
  const lines = cart?.lines ?? []

  if (!loading && !lines.length) {
    return (
      <div className="container section container--narrow">
        <h1 className="display-2">Your bag is empty</h1>
        <p className="lede mt-3">Add a piece before checking out.</p>
        <button className="btn mt-5" onClick={() => router.push('/shop')}>
          Shop the collection
        </button>
      </div>
    )
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (form.name.trim().length < 2) next.name = 'Recipient name is required'
    if (!/^01[3-9]\d{8}$/.test(form.phone.replace(/[^\d]/g, ''))) next.phone = 'Enter a valid 11-digit phone number'
    if (form.address.trim().length < 5) next.address = 'Full delivery address is required'
    if (!form.city.trim()) next.city = 'City / thana is required'
    if (!form.district.trim()) next.district = 'District is required'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setServerError(null)
    if (!validate()) return

    const purchaseEventId = `purchase_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    setSubmitting(true)
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        // Carry the cart token so the server resolves the same bag the
        // customer is looking at, even when cookies are blocked.
        headers: cartHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          ...form,
          addressId: form.addressId || null,
          utm,
          landingPage: window.location.pathname,
          eventId: purchaseEventId,
        }),
      })
      const payload = await response.json()
      if (payload.success) {
        trackEvent('Purchase', {
          value: totals?.grandTotal,
          contentIds: lines.filter((line) => !line.isFreeGift).map((line) => line.productId),
          numItems: totals?.paidItemCount,
          eventId: purchaseEventId,
        })
        router.push(`/order/${payload.data.orderNumber}?placed=1&token=${encodeURIComponent(payload.data.trackingToken)}`)
      } else {
        setServerError(payload.error || 'Could not place your order')
      }
    } catch {
      setServerError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))

  return (
    <div className="container section">
      <h1 className="display-2 mb-5">Checkout</h1>

      <form className="checkout-layout" onSubmit={submit} noValidate>
        <div className="stack" style={{ gap: '1.75rem' }}>
          {!isLoggedIn ? (
            <div className="alert alert--info">
              Have an account? <a href="/account" className="link-underline">Log in</a> to checkout faster and track orders.
            </div>
          ) : null}

          <section className="surface pad stack" style={{ gap: '1rem' }}>
            <h2 className="label">1 · Delivery details</h2>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div className="field">
                <label htmlFor="name">Recipient name</label>
                <input
                  id="name"
                  className={`input ${errors.name ? 'input--invalid' : ''}`}
                  value={form.name}
                  onChange={(event) => update('name', event.target.value)}
                  autoComplete="name"
                />
                {errors.name ? <span className="field__error">{errors.name}</span> : null}
              </div>

              <div className="field">
                <label htmlFor="phone">Phone number</label>
                <input
                  id="phone"
                  className={`input ${errors.phone ? 'input--invalid' : ''}`}
                  value={form.phone}
                  onChange={(event) => update('phone', event.target.value)}
                  inputMode="tel"
                  placeholder="01XXXXXXXXX"
                  autoComplete="tel"
                />
                {errors.phone ? <span className="field__error">{errors.phone}</span> : null}
              </div>
            </div>

            <div className="field">
              <label htmlFor="email">
                Email <span className="muted">(optional — for invoice &amp; tracking)</span>
              </label>
              <input
                id="email"
                type="email"
                className={`input ${errors.email ? 'input--invalid' : ''}`}
                value={form.email}
                onChange={(event) => update('email', event.target.value)}
                autoComplete="email"
              />
              {errors.email ? <span className="field__error">{errors.email}</span> : null}
            </div>

            <div className="field">
              <label htmlFor="address">Full address</label>
              <textarea
                id="address"
                className={`textarea ${errors.address ? 'input--invalid' : ''}`}
                value={form.address}
                onChange={(event) => update('address', event.target.value)}
                placeholder="House / road / area"
                style={{ minHeight: 80 }}
              />
              {errors.address ? <span className="field__error">{errors.address}</span> : null}
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div className="field">
                <label htmlFor="area">Area / landmark</label>
                <input id="area" className="input" value={form.area} onChange={(event) => update('area', event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="city">City / thana</label>
                <input
                  id="city"
                  className={`input ${errors.city ? 'input--invalid' : ''}`}
                  value={form.city}
                  onChange={(event) => update('city', event.target.value)}
                />
                {errors.city ? <span className="field__error">{errors.city}</span> : null}
              </div>
              <div className="field">
                <label htmlFor="district">District</label>
                <select
                  id="district"
                  className="select"
                  value={form.district}
                  onChange={(event) => update('district', event.target.value)}
                >
                  {DISTRICTS.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="postcode">Post code</label>
                <input
                  id="postcode"
                  className="input"
                  value={form.postcode}
                  onChange={(event) => update('postcode', event.target.value)}
                  inputMode="numeric"
                />
              </div>
            </div>

            {addresses.length ? (
              <div className="field">
                <label htmlFor="saved">Saved address</label>
                <select
                  id="saved"
                  className="select"
                  value={form.addressId}
                  onChange={(event) => update('addressId', event.target.value)}
                >
                  <option value="">Enter a new address</option>
                  {addresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.label} — {address.address}, {address.city}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="field">
              <label htmlFor="notes">Order notes (optional)</label>
              <textarea
                id="notes"
                className="textarea"
                style={{ minHeight: 70 }}
                value={form.notes}
                onChange={(event) => update('notes', event.target.value)}
                placeholder="Delivery instructions, gift message…"
              />
            </div>
          </section>

          <section className="surface pad stack" style={{ gap: '1rem' }}>
            <h2 className="label">2 · Payment</h2>
            <div className="stack" style={{ gap: '0.6rem' }}>
              {[
                { value: 'COD', label: 'Cash on delivery', hint: 'Pay the rider when your parcel arrives' },
                { value: 'BKASH', label: 'bKash', hint: 'We will call to confirm the payment number' },
                { value: 'NAGAD', label: 'Nagad', hint: 'We will call to confirm the payment number' },
              ].map((method) => (
                <label key={method.value} className="checkbox">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.value}
                    checked={form.paymentMethod === method.value}
                    onChange={(event) => update('paymentMethod', event.target.value)}
                  />
                  <span>
                    <strong>{method.label}</strong>
                    <br />
                    <span className="small muted">{method.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="small muted">
              Delivery inside Dhaka {formatMoney(settings.shippingInsideDhaka)}, outside {formatMoney(settings.shippingOutsideDhaka)}
              {settings.freeShippingThreshold ? ` · free over ${formatMoney(settings.freeShippingThreshold)}` : ''}
            </p>
          </section>
        </div>

        {/* -------------------------------------------------------- summary -- */}
        <aside className="surface pad stack" style={{ gap: '1rem', position: 'sticky', top: 'calc(var(--header-height) + 1rem)' }}>
          <h2 className="label">Order summary</h2>

          <div className="stack" style={{ gap: '0.6rem' }}>
            {lines.map((line) => (
              <div key={line.id} className="row" style={{ justifyContent: 'space-between', gap: '0.75rem' }}>
                <span className="small">
                  {line.name}
                  {line.variantName ? ` · ${line.variantName}` : ''} × {line.quantity}
                </span>
                <span className="small">{line.isFreeGift ? 'Free' : formatMoney(line.lineTotal)}</span>
              </div>
            ))}
          </div>

          <hr className="divider" />

          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatMoney(totals?.subtotal ?? 0)}</span>
          </div>
          {totals?.discountTotal ? (
            <div className="summary-row" style={{ color: 'var(--brass-600)' }}>
              <span>Discount</span>
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
            <span>Total payable</span>
            <span>{formatMoney(totals?.grandTotal ?? 0)}</span>
          </div>

          {serverError ? <p className="alert alert--danger">{serverError}</p> : null}

          <button type="submit" className="btn btn--block btn--lg" disabled={submitting}>
            {submitting ? 'Placing order…' : `Place order · ${formatMoney(totals?.grandTotal ?? 0)}`}
          </button>

          <p className="small muted">
            By placing this order you agree to our delivery and exchange policy. Questions? Call {settings.supportPhone}.
          </p>
        </aside>
      </form>
    </div>
  )
}
