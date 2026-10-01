'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate, formatMoney } from '@/lib/utils'

interface Coupon {
  id: string
  code: string
  type: string
  value: number
  description: string | null
  minSubtotal: number
  maxDiscount: number | null
  usageLimit: number | null
  usedCount: number
  perUserLimit: number
  startsAt: string | null
  endsAt: string | null
  isActive: boolean
  _count?: { redemptions: number }
}

export function CouponManager({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter()
  const [form, setForm] = useState({
    code: '',
    type: 'PERCENT',
    value: '',
    description: '',
    minSubtotal: '',
    maxDiscount: '',
    usageLimit: '',
    perUserLimit: '1',
    endsAt: '',
  })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code,
          type: form.type,
          value: Math.round(Number(form.value) * (form.type === 'PERCENT' ? 1 : 100)),
          description: form.description || null,
          minSubtotal: form.minSubtotal ? Math.round(Number(form.minSubtotal) * 100) : 0,
          maxDiscount: form.maxDiscount ? Math.round(Number(form.maxDiscount) * 100) : null,
          usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
          perUserLimit: Number(form.perUserLimit) || 1,
          endsAt: form.endsAt || null,
        }),
      })
      const payload = await response.json()
      if (payload.success) {
        setMessage(`Coupon ${payload.data.code} created`)
        setForm({ code: '', type: 'PERCENT', value: '', description: '', minSubtotal: '', maxDiscount: '', usageLimit: '', perUserLimit: '1', endsAt: '' })
        router.refresh()
      } else {
        setError(payload.error)
      }
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (coupon: Coupon) => {
    await fetch(`/api/admin/coupons/${coupon.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !coupon.isActive }),
    })
    router.refresh()
  }

  const remove = async (coupon: Coupon) => {
    await fetch(`/api/admin/coupons/${coupon.id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
      <form className="surface pad stack" style={{ gap: '1rem' }} onSubmit={create}>
        <h2 className="label">New coupon</h2>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="field">
            <label htmlFor="coupon-code">Code</label>
            <input
              id="coupon-code"
              className="input"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="coupon-type">Type</label>
            <select
              id="coupon-type"
              className="select"
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value })}
            >
              <option value="PERCENT">Percent off</option>
              <option value="FIXED">Fixed amount off</option>
              <option value="FREE_SHIPPING">Free shipping</option>
            </select>
          </div>
        </div>

        {form.type !== 'FREE_SHIPPING' ? (
          <div className="field">
            <label htmlFor="coupon-value">Value {form.type === 'PERCENT' ? '(%)' : '(৳)'}</label>
            <input
              id="coupon-value"
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={form.value}
              onChange={(event) => setForm({ ...form, value: event.target.value })}
              required
            />
          </div>
        ) : null}

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="field">
            <label htmlFor="coupon-min">Minimum order (৳)</label>
            <input
              id="coupon-min"
              className="input"
              type="number"
              min="0"
              value={form.minSubtotal}
              onChange={(event) => setForm({ ...form, minSubtotal: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="coupon-max">Max discount (৳)</label>
            <input
              id="coupon-max"
              className="input"
              type="number"
              min="0"
              value={form.maxDiscount}
              onChange={(event) => setForm({ ...form, maxDiscount: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="coupon-limit">Total usage limit</label>
            <input
              id="coupon-limit"
              className="input"
              type="number"
              min="0"
              value={form.usageLimit}
              onChange={(event) => setForm({ ...form, usageLimit: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="coupon-per-user">Per customer limit</label>
            <input
              id="coupon-per-user"
              className="input"
              type="number"
              min="1"
              value={form.perUserLimit}
              onChange={(event) => setForm({ ...form, perUserLimit: event.target.value })}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="coupon-ends">Expires on</label>
          <input
            id="coupon-ends"
            className="input"
            type="date"
            value={form.endsAt}
            onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="coupon-description">Description</label>
          <input
            id="coupon-description"
            className="input"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </div>

        <button type="submit" className="btn" disabled={busy}>
          Create coupon
        </button>
        {message ? <p className="alert alert--ok">{message}</p> : null}
        {error ? <p className="alert alert--danger">{error}</p> : null}
      </form>

      <div className="table-wrap">
        <table className="table table--compact">
          <thead>
            <tr>
              <th>Code</th>
              <th>Value</th>
              <th>Used</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <tr key={coupon.id}>
                <td>
                  <span className="mono">{coupon.code}</span>
                  {coupon.description ? <div className="small muted">{coupon.description}</div> : null}
                </td>
                <td>
                  {coupon.type === 'PERCENT'
                    ? `${coupon.value}%`
                    : coupon.type === 'FIXED'
                      ? formatMoney(coupon.value)
                      : 'Free shipping'}
                  <div className="small muted">min {formatMoney(coupon.minSubtotal)}</div>
                </td>
                <td>
                  {coupon.usedCount}
                  {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}
                </td>
                <td>
                  <span className={`badge ${coupon.isActive ? 'badge--ok' : ''}`}>
                    {coupon.isActive ? 'active' : 'paused'}
                  </span>
                  {coupon.endsAt ? <div className="small muted">until {formatDate(coupon.endsAt)}</div> : null}
                </td>
                <td>
                  <div className="row gap-2">
                    <button type="button" className="link-underline" onClick={() => toggle(coupon)}>
                      {coupon.isActive ? 'Pause' : 'Activate'}
                    </button>
                    <button type="button" className="link-underline" onClick={() => remove(coupon)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
