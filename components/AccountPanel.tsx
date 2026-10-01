'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ProductCard } from './ProductCard'
import { formatDate, formatMoney, srcSetFor } from '@/lib/utils'
import { useCart } from './CartProvider'

interface AccountPanelProps {
  customer: { id: string; name: string | null; phone: string; email: string | null }
  orders: Array<{
    id: string
    orderNumber: string
    status: string
    grandTotal: number
    createdAt: string
    itemCount: number
    trackingCode: string | null
  }>
  wishlist: Array<{ id: string; product: any }>
  addresses: Array<{
    id: string
    label: string
    recipient: string
    phone: string
    address: string
    area: string | null
    city: string
    district: string
    postcode: string | null
    isDefault: boolean
  }>
  reviews: Array<{
    id: string
    rating: number
    body: string
    isApproved: boolean
    createdAt: string
    product: { name: string; slug: string }
  }>
}

const TABS = ['Orders', 'Wishlist', 'Addresses', 'Profile', 'Reviews']

export function AccountPanel({ customer, orders, wishlist, addresses, reviews }: AccountPanelProps) {
  const router = useRouter()
  const { addItem } = useCart()
  const [tab, setTab] = useState('Orders')
  const [profile, setProfile] = useState({
    name: customer.name || '',
    email: customer.email || '',
    password: '',
    currentPassword: '',
  })
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    recipient: customer.name || '',
    phone: customer.phone,
    address: '',
    area: '',
    city: '',
    district: 'Dhaka',
    postcode: '',
  })

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      const payload = await response.json()
      setMessage(payload.success ? 'Profile updated' : payload.error)
      if (payload.success) {
        setProfile((current) => ({ ...current, password: '', currentPassword: '' }))
        router.refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  const addAddress = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch('/api/account/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAddress),
      })
      const payload = await response.json()
      setMessage(payload.success ? 'Address saved' : payload.error)
      if (payload.success) router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const logout = async () => {
    await fetch('/api/auth/customer/logout', { method: 'POST' })
    router.refresh()
    router.push('/')
  }

  return (
    <div className="container section">
      <div className="toolbar mb-5">
        <div>
          <div className="eyebrow">My account</div>
          <h1 className="display-2 mt-2">{customer.name || customer.phone}</h1>
          <p className="small muted mt-2">
            {customer.phone}
            {customer.email ? ` · ${customer.email}` : ''}
          </p>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={logout}>
          Log out
        </button>
      </div>

      <div className="tabs">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            aria-current={tab === item ? 'page' : undefined}
            style={{ borderBottom: '2px solid transparent', ...(tab === item ? { color: 'var(--ink-900)', borderColor: 'var(--ink-900)' } : {}) }}
          >
            {item}
            {item === 'Orders' && orders.length ? ` (${orders.length})` : ''}
            {item === 'Wishlist' && wishlist.length ? ` (${wishlist.length})` : ''}
          </button>
        ))}
      </div>

      {message ? <p className="alert alert--ok mt-4">{message}</p> : null}

      {tab === 'Orders' ? (
        <div className="table-wrap mt-4">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Placed</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="mono">{order.orderNumber}</td>
                  <td>{formatDate(order.createdAt)}</td>
                  <td>{order.itemCount}</td>
                  <td>{formatMoney(order.grandTotal)}</td>
                  <td>
                    <span
                      className={`badge ${
                        order.status === 'DELIVERED'
                          ? 'badge--ok'
                          : order.status === 'CANCELLED' || order.status === 'RETURNED'
                            ? 'badge--danger'
                            : 'badge--info'
                      }`}
                    >
                      {order.status.replace(/_/g, ' ').toLowerCase()}
                    </span>
                  </td>
                  <td>
                    <Link href={`/order/${order.orderNumber}`} className="link-underline">
                      Track
                    </Link>
                  </td>
                </tr>
              ))}
              {!orders.length ? (
                <tr>
                  <td colSpan={6} className="center muted">
                    No orders yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'Wishlist' ? (
        <div className="mt-4">
          {wishlist.length ? (
            <div className="grid grid--products">
              {wishlist.map((item) => (
                <div key={item.id} className="stack" style={{ gap: '0.5rem' }}>
                  <ProductCard product={item.product} />
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={async () => {
                      const variant = item.product.variants?.[0]
                      if (variant) await addItem({ productId: item.product.id, variantId: variant.id, quantity: 1 })
                      await fetch('/api/wishlist', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ productId: item.product.id }),
                      })
                      router.refresh()
                    }}
                  >
                    Add to bag
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">Nothing saved yet — tap the heart on a product to save it.</div>
          )}
        </div>
      ) : null}

      {tab === 'Addresses' ? (
        <div className="grid mt-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <div className="stack" style={{ gap: '1rem' }}>
            {addresses.map((address) => (
              <div key={address.id} className="surface pad">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>{address.label}</strong>
                  {address.isDefault ? <span className="badge badge--ok">Default</span> : null}
                </div>
                <p className="small muted mt-2" style={{ lineHeight: 1.7 }}>
                  {address.recipient}
                  <br />
                  {address.address}
                  <br />
                  {address.area ? `${address.area}, ` : ''}
                  {address.city}, {address.district}
                  <br />
                  {address.phone}
                </p>
              </div>
            ))}
            {!addresses.length ? <div className="empty-state">No saved addresses.</div> : null}
          </div>

          <form className="surface pad stack" style={{ gap: '0.9rem' }} onSubmit={addAddress}>
            <h2 className="label">Add an address</h2>
            {(
              [
                ['label', 'Label'],
                ['recipient', 'Recipient'],
                ['phone', 'Phone'],
                ['address', 'Address'],
                ['area', 'Area'],
                ['city', 'City'],
                ['district', 'District'],
                ['postcode', 'Post code'],
              ] as const
            ).map(([key, label]) => (
              <div className="field" key={key}>
                <label htmlFor={`address-${key}`}>{label}</label>
                <input
                  id={`address-${key}`}
                  className="input"
                  value={(newAddress as any)[key]}
                  onChange={(event) => setNewAddress({ ...newAddress, [key]: event.target.value })}
                  required={key !== 'area' && key !== 'postcode'}
                />
              </div>
            ))}
            <button type="submit" className="btn" disabled={busy}>
              Save address
            </button>
          </form>
        </div>
      ) : null}

      {tab === 'Profile' ? (
        <form className="surface pad stack mt-4" style={{ gap: '1rem', maxWidth: 560 }} onSubmit={saveProfile}>
          <div className="field">
            <label htmlFor="profile-name">Name</label>
            <input
              id="profile-name"
              className="input"
              value={profile.name}
              onChange={(event) => setProfile({ ...profile, name: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="profile-email">Email</label>
            <input
              id="profile-email"
              type="email"
              className="input"
              value={profile.email}
              onChange={(event) => setProfile({ ...profile, email: event.target.value })}
            />
          </div>
          <hr className="divider" />
          <div className="field">
            <label htmlFor="profile-current">Current password</label>
            <input
              id="profile-current"
              type="password"
              className="input"
              value={profile.currentPassword}
              onChange={(event) => setProfile({ ...profile, currentPassword: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="profile-password">New password</label>
            <input
              id="profile-password"
              type="password"
              className="input"
              value={profile.password}
              onChange={(event) => setProfile({ ...profile, password: event.target.value })}
            />
          </div>
          <button type="submit" className="btn" disabled={busy}>
            Save changes
          </button>
        </form>
      ) : null}

      {tab === 'Reviews' ? (
        <div className="mt-4 stack" style={{ gap: '1rem' }}>
          {reviews.map((review) => (
            <div key={review.id} className="surface pad">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <Link href={`/product/${review.product.slug}`} className="link-underline">
                  {review.product.name}
                </Link>
                <span className={`badge ${review.isApproved ? 'badge--ok' : 'badge--warn'}`}>
                  {review.isApproved ? 'Published' : 'Awaiting approval'}
                </span>
              </div>
              <p className="mt-2" style={{ fontSize: '0.94rem' }}>
                {'★'.repeat(review.rating)}
                <span className="muted">{'★'.repeat(5 - review.rating)}</span> — {review.body}
              </p>
              <div className="small muted mt-2">{formatDate(review.createdAt)}</div>
            </div>
          ))}
          {!reviews.length ? <div className="empty-state">You have not written any reviews yet.</div> : null}
        </div>
      ) : null}
    </div>
  )
}
