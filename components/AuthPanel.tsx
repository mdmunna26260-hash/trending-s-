'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function AuthPanel() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ phone: '', password: '', name: '', email: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/auth/customer/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await response.json()
      if (payload.success) {
        router.refresh()
        router.push('/account')
      } else {
        setError(payload.error)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container section container--narrow">
      <div className="eyebrow">Account</div>
      <h1 className="display-2 mt-2 mb-5">{mode === 'login' ? 'Log in' : 'Create an account'}</h1>

      <div className="tabs">
        <button
          type="button"
          onClick={() => setMode('login')}
          aria-current={mode === 'login' ? 'page' : undefined}
          style={{ borderBottom: '2px solid transparent', ...(mode === 'login' ? { color: 'var(--ink-900)', borderColor: 'var(--ink-900)' } : {}) }}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          aria-current={mode === 'register' ? 'page' : undefined}
          style={{ borderBottom: '2px solid transparent', ...(mode === 'register' ? { color: 'var(--ink-900)', borderColor: 'var(--ink-900)' } : {}) }}
        >
          Register
        </button>
      </div>

      <form className="surface pad stack" style={{ gap: '1rem' }} onSubmit={submit}>
        {mode === 'register' ? (
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              className="input"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
              autoComplete="name"
            />
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="phone">Phone number</label>
          <input
            id="phone"
            className="input"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            placeholder="01XXXXXXXXX"
            inputMode="tel"
            required
            autoComplete="tel"
          />
          <span className="field__hint">We use your phone number as your login — no username to remember.</span>
        </div>

        {mode === 'register' ? (
          <div className="field">
            <label htmlFor="email">
              Email <span className="muted">(optional)</span>
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              autoComplete="email"
            />
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="input"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          {mode === 'register' ? (
            <span className="field__hint">At least 8 characters with upper and lower case letters and a number.</span>
          ) : null}
        </div>

        {error ? <p className="alert alert--danger">{error}</p> : null}

        <button type="submit" className="btn btn--block" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
      </form>

      <p className="small muted mt-4">
        You can also track any order without an account from the{' '}
        <Link href="/order/RVDEMO1000" className="link-underline">
          order tracking page
        </Link>
        .
      </p>
    </div>
  )
}
