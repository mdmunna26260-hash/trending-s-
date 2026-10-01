'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CustomerActions({
  customerId,
  isBlocked,
  blockReason,
  phone,
}: {
  customerId: string
  isBlocked: boolean
  blockReason: string | null
  phone: string
}) {
  const router = useRouter()
  const [reason, setReason] = useState(blockReason || '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const act = async (data: Record<string, unknown>, label: string) => {
    setBusy(true)
    try {
      const response = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const payload = await response.json()
      setMessage(payload.success ? label : payload.error)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="surface pad stack" style={{ gap: '0.75rem', minWidth: 260 }}>
      <h2 className="label">Actions</h2>
      <div className="field">
        <label htmlFor="block-reason">Block / note reason</label>
        <input
          id="block-reason"
          className="input"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. repeated COD refusals"
        />
      </div>
      <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
        {isBlocked ? (
          <button
            type="button"
            className="btn btn--sm"
            disabled={busy}
            onClick={() => act({ isBlocked: false, blockReason: null }, 'Customer unblocked')}
          >
            Unblock
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--sm btn--danger"
            disabled={busy}
            onClick={() => act({ isBlocked: true, blockReason: reason }, 'Customer blocked — sessions invalidated')}
          >
            Block customer
          </button>
        )}
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={busy}
          onClick={() =>
            fetch('/api/admin/blacklist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'PHONE', value: phone, reason: reason || 'Fraud report', severity: 'BLOCK' }),
            }).then(() => {
              setMessage('Phone blacklisted')
              router.refresh()
            })
          }
        >
          Blacklist phone
        </button>
        <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => act({ notes: reason }, 'Notes saved')}>
          Save notes
        </button>
      </div>
      {message ? <p className="small muted">{message}</p> : null}
    </div>
  )
}
