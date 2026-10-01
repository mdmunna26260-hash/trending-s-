'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'

interface Entry {
  id: string
  type: string
  value: string
  reason: string | null
  severity: string
  isActive: boolean
  expiresAt: string | null
  createdAt: string
}

export function BlacklistManager({ entries }: { entries: Entry[] }) {
  const router = useRouter()
  const [form, setForm] = useState({ type: 'PHONE', value: '', reason: '', severity: 'BLOCK' })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const add = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await response.json()
      if (payload.success) {
        setMessage(`${form.type} ${form.value} saved`)
        setForm({ type: 'PHONE', value: '', reason: '', severity: 'BLOCK' })
        router.refresh()
      } else {
        setError(payload.error)
      }
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    await fetch(`/api/admin/blacklist/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
      <form className="surface pad stack" style={{ gap: '1rem' }} onSubmit={add}>
        <h2 className="label">Add to blacklist</h2>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="field">
            <label htmlFor="bl-type">Type</label>
            <select
              id="bl-type"
              className="select"
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value })}
            >
              <option value="PHONE">Phone</option>
              <option value="EMAIL">Email</option>
              <option value="IP">IP address</option>
              <option value="CUSTOMER">Customer ID</option>
              <option value="ADDRESS">Address keyword</option>
              <option value="DEVICE">Device</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="bl-severity">Severity</label>
            <select
              id="bl-severity"
              className="select"
              value={form.severity}
              onChange={(event) => setForm({ ...form, severity: event.target.value })}
            >
              <option value="BLOCK">Block orders</option>
              <option value="REVIEW">Flag for review</option>
              <option value="WARN">Warn only</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="bl-value">Value</label>
          <input
            id="bl-value"
            className="input"
            value={form.value}
            onChange={(event) => setForm({ ...form, value: event.target.value })}
            placeholder="01XXXXXXXXX"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="bl-reason">Reason</label>
          <input
            id="bl-reason"
            className="input"
            value={form.reason}
            onChange={(event) => setForm({ ...form, reason: event.target.value })}
          />
        </div>
        <button type="submit" className="btn" disabled={busy}>
          Save entry
        </button>
        {message ? <p className="alert alert--ok">{message}</p> : null}
        {error ? <p className="alert alert--danger">{error}</p> : null}
      </form>

      <div className="table-wrap">
        <table className="table table--compact">
          <thead>
            <tr>
              <th>Type</th>
              <th>Value</th>
              <th>Severity</th>
              <th>Added</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.type.toLowerCase()}</td>
                <td>
                  <span className="mono">{entry.value}</span>
                  {entry.reason ? <div className="small muted">{entry.reason}</div> : null}
                </td>
                <td>
                  <span className={`badge ${entry.severity === 'BLOCK' ? 'badge--danger' : 'badge--warn'}`}>
                    {entry.severity.toLowerCase()}
                  </span>
                  {!entry.isActive ? <span className="badge" style={{ marginLeft: 4 }}>removed</span> : null}
                </td>
                <td className="small muted">{formatDateTime(entry.createdAt)}</td>
                <td>
                  {entry.isActive ? (
                    <button type="button" className="link-underline" onClick={() => remove(entry.id)}>
                      Remove
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {!entries.length ? (
              <tr>
                <td colSpan={5} className="center muted">
                  No blacklist entries.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
