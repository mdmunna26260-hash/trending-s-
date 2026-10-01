'use client'

import { useState } from 'react'

export function CourierPanel() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const test = async () => {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const response = await fetch('/api/admin/courier/test', { method: 'POST' })
      const payload = await response.json()
      if (payload.success) setResult(`Connected · balance response: ${JSON.stringify(payload.data)}`)
      else setError(payload.error)
    } finally {
      setBusy(false)
    }
  }

  const webhookUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/steadfast` : '/api/webhooks/steadfast'

  return (
    <div className="surface pad stack" style={{ gap: '1rem' }}>
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 className="label">Integration</h2>
          <p className="small muted mt-2">
            Credentials live in environment variables (STEADFAST_API_KEY / STEADFAST_SECRET_KEY). Parcels are created
            automatically when an order is confirmed, or manually from any order page.
          </p>
        </div>
        <button type="button" className="btn btn--sm" onClick={test} disabled={busy}>
          {busy ? 'Testing…' : 'Test connection'}
        </button>
      </div>

      {result ? <p className="alert alert--ok">{result}</p> : null}
      {error ? <p className="alert alert--danger">{error}</p> : null}

      <div className="stack" style={{ gap: '0.35rem' }}>
        <span className="label">Delivery status webhook</span>
        <code className="mono" style={{ wordBreak: 'break-all' }}>
          {webhookUrl}
        </code>
        <span className="small muted">
          Register this URL in the Steadfast merchant panel. Incoming payloads are HMAC-verified (when a secret is set),
          stored on the parcel and mapped onto the order lifecycle.
        </span>
      </div>
    </div>
  )
}
