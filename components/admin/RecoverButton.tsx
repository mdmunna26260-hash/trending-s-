'use client'

import { useEffect, useState } from 'react'
import { formatMoney } from '@/lib/utils'

interface Cart {
  id: string
  customer: { name: string | null; phone: string; email: string | null } | null
  itemCount: number
  total: number
  lastActivityAt: string
  couponCode: string | null
  recoveryEmailSentAt: string | null
}

/** Lists the oldest abandoned carts and sends recovery emails. */
export function RecoverButton() {
  const [carts, setCarts] = useState<Cart[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/marketing/carts')
      const payload = await response.json()
      if (payload.success) setCarts(payload.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const send = async (cartId: string) => {
    setBusyId(cartId)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/marketing/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId }),
      })
      const payload = await response.json()
      setMessage(payload.success ? (payload.data.sent ? 'Recovery email sent' : payload.data.reason) : payload.error)
      load()
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <div className="skeleton" style={{ height: 60 }} />

  if (!carts.length) return <p className="small muted">No abandoned carts right now.</p>

  return (
    <div className="stack" style={{ gap: '0.5rem' }}>
      {carts.slice(0, 5).map((cart) => (
        <div key={cart.id} className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div className="small">
            <strong>{cart.customer?.name || cart.customer?.phone || 'Guest'}</strong>
            {cart.customer?.email ? ` · ${cart.customer.email}` : ' · no email'}
            <div className="muted">
              {cart.itemCount} item(s) · {formatMoney(cart.total)} · idle since{' '}
              {new Date(cart.lastActivityAt).toLocaleDateString('en-GB')}
            </div>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={!cart.customer?.email || busyId === cart.id}
            onClick={() => send(cart.id)}
          >
            {cart.recoveryEmailSentAt ? 'Send again' : 'Send recovery'}
          </button>
        </div>
      ))}
      {message ? <p className="small muted">{message}</p> : null}
    </div>
  )
}
