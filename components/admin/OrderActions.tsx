'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from '@/lib/order-status'
import type { OrderStatus } from '@prisma/client'

interface OrderActionsProps {
  order: {
    id: string
    orderNumber: string
    status: OrderStatus
    customerName: string
    customerPhone: string
    customerEmail: string | null
    fraudStatus: string
    riskScore: number
    parcel: {
      id: string
      consignmentId: string | null
      trackingCode: string | null
      status: string
      riderName: string | null
      riderPhone: string | null
      syncError: string | null
    } | null
    fraudChecks: Array<{ provider: string; result: string; score: number; summary: string | null }>
  }
}

const NEXT_STATUSES: Record<string, string[]> = ORDER_STATUS_FLOW

export function OrderActions({ order }: OrderActionsProps) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const act = async (action: 'status' | 'parcel' | 'sync' | 'block', payload?: Record<string, unknown>) => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      let response: Response
      if (action === 'parcel') {
        response = await fetch(`/api/admin/orders/${order.id}/parcel`, { method: 'POST' })
      } else if (action === 'sync') {
        response = await fetch(`/api/admin/orders/${order.id}/parcel`, { method: 'PUT' })
      } else if (action === 'block') {
        response = await fetch(`/api/admin/blacklist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'PHONE', value: order.customerPhone, reason: note || 'Fraud report', severity: 'BLOCK' }),
        })
      } else {
        response = await fetch(`/api/admin/orders/${order.id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: payload?.status, note, notify: payload?.notify !== false }),
        })
      }
      const result = await response.json()
      if (result.success) {
        setMessage(
          action === 'parcel'
            ? 'Parcel created with the courier'
            : action === 'sync'
              ? 'Courier status refreshed'
              : action === 'block'
                ? 'Phone number blacklisted'
                : `Order moved to ${String(payload?.status).replace(/_/g, ' ').toLowerCase()}`,
        )
        router.refresh()
      } else {
        setError(result.error)
      }
    } finally {
      setBusy(false)
    }
  }

  const allowed = NEXT_STATUSES[order.status] || []

  return (
    <div className="surface pad stack" style={{ gap: '1rem' }}>
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 className="label">Order actions</h2>
        {order.fraudStatus !== 'PASSED' ? (
          <span className="badge badge--danger">
            Fraud: {order.fraudStatus.toLowerCase()} · risk {order.riskScore}
          </span>
        ) : null}
      </div>

      <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
        {allowed.map((status) => (
          <button
            key={status}
            type="button"
            className={`btn btn--sm ${status === 'CANCELLED' ? 'btn--danger' : ''}`}
            disabled={busy}
            onClick={() => act('status', { status })}
          >
            {ORDER_STATUS_LABELS[status as OrderStatus]}
          </button>
        ))}

        {!order.parcel ? (
          <button type="button" className="btn btn--sm btn--brass" disabled={busy} onClick={() => act('parcel')}>
            Create courier parcel
          </button>
        ) : (
          <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => act('sync')}>
            Sync courier status
          </button>
        )}

        <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => act('block')}>
          Blacklist phone
        </button>
      </div>

      <div className="field" style={{ maxWidth: 520 }}>
        <label htmlFor="order-note">Internal note / reason (sent to customer for cancellations)</label>
        <input
          id="order-note"
          className="input"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="e.g. out of stock in L, cancelled by phone"
        />
      </div>

      {message ? <p className="alert alert--ok">{message}</p> : null}
      {error ? <p className="alert alert--danger">{error}</p> : null}

      {order.parcel ? (
        <div className="small muted">
          Parcel {order.parcel.consignmentId || '—'} · tracking {order.parcel.trackingCode || '—'} ·{' '}
          {order.parcel.status.toLowerCase()}
          {order.parcel.riderName ? ` · rider ${order.parcel.riderName} (${order.parcel.riderPhone})` : ''}
          {order.parcel.syncError ? ` · last sync error: ${order.parcel.syncError}` : ''}
        </div>
      ) : null}

      {order.fraudChecks.length ? (
        <details>
          <summary className="label">Fraud check detail</summary>
          <ul className="stack mt-3" style={{ gap: '0.3rem' }}>
            {order.fraudChecks.map((check, index) => (
              <li key={index} className="small muted">
                {check.provider} — {check.result.toLowerCase()} (score {check.score}): {check.summary}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  )
}
