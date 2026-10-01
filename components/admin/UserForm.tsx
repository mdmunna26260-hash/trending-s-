'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'

interface AdminRow {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  lastLoginAt: string | null
}

export function UserManager({ admins }: { admins: AdminRow[] }) {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'STAFF' })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await response.json()
      if (payload.success) {
        setMessage(`Admin ${payload.data.email} created`)
        setForm({ email: '', name: '', password: '', role: 'STAFF' })
        router.refresh()
      } else {
        setError(payload.error)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
      <form className="surface pad stack" style={{ gap: '1rem' }} onSubmit={create}>
        <h2 className="label">Add admin user</h2>
        <div className="field">
          <label htmlFor="admin-name">Name</label>
          <input id="admin-name" className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </div>
        <div className="field">
          <label htmlFor="admin-email">Email</label>
          <input
            id="admin-email"
            type="email"
            className="input"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="admin-password">Temporary password</label>
          <input
            id="admin-password"
            type="password"
            className="input"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
          <span className="field__hint">8+ characters with upper and lower case letters and a number.</span>
        </div>
        <div className="field">
          <label htmlFor="admin-role">Role</label>
          <select id="admin-role" className="select" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            <option value="STAFF">Staff — orders, inventory, reviews</option>
            <option value="MANAGER">Manager — everything except settings &amp; users</option>
            <option value="OWNER">Owner — full access</option>
          </select>
        </div>
        <button type="submit" className="btn" disabled={busy}>
          Create user
        </button>
        {message ? <p className="alert alert--ok">{message}</p> : null}
        {error ? <p className="alert alert--danger">{error}</p> : null}
      </form>

      <div className="table-wrap">
        <table className="table table--compact">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Last login</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id}>
                <td>{admin.name}</td>
                <td className="small">{admin.email}</td>
                <td>
                  <span className={`badge ${admin.role === 'OWNER' ? 'badge--ink' : ''}`}>{admin.role.toLowerCase()}</span>
                  {!admin.isActive ? <span className="badge badge--danger" style={{ marginLeft: 4 }}>disabled</span> : null}
                </td>
                <td className="small muted">{admin.lastLoginAt ? formatDateTime(admin.lastLoginAt) : 'never'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
