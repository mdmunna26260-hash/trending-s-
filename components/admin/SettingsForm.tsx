'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatMoney } from '@/lib/utils'
import type { StoreSettings } from '@/lib/queries'

export function SettingsForm({
  settings,
  smtpConfigured,
  steadfastConfigured,
}: {
  settings: StoreSettings
  smtpConfigured: boolean
  steadfastConfigured: boolean
}) {
  const router = useRouter()
  const [form, setForm] = useState({ ...settings })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const update = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await response.json()
      if (payload.success) {
        setMessage('Settings saved')
        router.refresh()
      } else {
        setError(payload.error)
      }
    } finally {
      setBusy(false)
    }
  }

  const money = (key: keyof StoreSettings, label: string) => (
    <div className="field">
      <label htmlFor={key}>{label}</label>
      <input
        id={key}
        className="input"
        type="number"
        min="0"
        value={Number(form[key]) / 100}
        onChange={(event) => update(key, (Math.round(Number(event.target.value) * 100) as never))}
      />
      <span className="field__hint">{formatMoney(Number(form[key]))}</span>
    </div>
  )

  return (
    <form className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }} onSubmit={save}>
      <section className="surface pad stack" style={{ gap: '1rem' }}>
        <h2 className="label">Store</h2>
        <div className="field">
          <label htmlFor="storeName">Store name</label>
          <input id="storeName" className="input" value={form.storeName} onChange={(event) => update('storeName', event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="tagline">Tagline</label>
          <input id="tagline" className="input" value={form.tagline} onChange={(event) => update('tagline', event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="announcement">Announcement bar</label>
          <input
            id="announcement"
            className="input"
            value={form.announcement}
            onChange={(event) => update('announcement', event.target.value)}
          />
        </div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="field">
            <label htmlFor="supportPhone">Support phone</label>
            <input id="supportPhone" className="input" value={form.supportPhone} onChange={(event) => update('supportPhone', event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="whatsappNumber">WhatsApp number</label>
            <input
              id="whatsappNumber"
              className="input"
              value={form.whatsappNumber}
              onChange={(event) => update('whatsappNumber', event.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="supportEmail">Support email</label>
          <input
            id="supportEmail"
            type="email"
            className="input"
            value={form.supportEmail}
            onChange={(event) => update('supportEmail', event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="address">Address</label>
          <input id="address" className="input" value={form.address} onChange={(event) => update('address', event.target.value)} />
        </div>
      </section>

      <section className="surface pad stack" style={{ gap: '1rem' }}>
        <h2 className="label">Delivery &amp; fees</h2>
        {money('shippingInsideDhaka', 'Delivery inside Dhaka')}
        {money('shippingOutsideDhaka', 'Delivery outside Dhaka')}
        {money('freeShippingThreshold', 'Free delivery above')}
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="field">
            <label htmlFor="codFeePercent">COD handling fee (%)</label>
            <input
              id="codFeePercent"
              className="input"
              type="number"
              min="0"
              max="20"
              step="0.1"
              value={form.codFeePercent}
              onChange={(event) => update('codFeePercent', Number(event.target.value))}
            />
          </div>
          {money('codFeeFlat', 'COD flat fee')}
        </div>
        {money('minOrderValue', 'Minimum order value')}
        <div className="field">
          <label htmlFor="lowStockThreshold">Low stock threshold</label>
          <input
            id="lowStockThreshold"
            className="input"
            type="number"
            min="0"
            value={form.lowStockThreshold}
            onChange={(event) => update('lowStockThreshold', Number(event.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="orderPrefix">Order number prefix</label>
          <input
            id="orderPrefix"
            className="input"
            value={form.orderPrefix}
            onChange={(event) => update('orderPrefix', event.target.value.toUpperCase())}
          />
        </div>
      </section>

      <section className="surface pad stack" style={{ gap: '1rem' }}>
        <h2 className="label">Automation</h2>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.autoParcelOnConfirm}
            onChange={(event) => update('autoParcelOnConfirm', event.target.checked)}
          />
          <span>Create the courier parcel automatically when an order is confirmed</span>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.requireReviewApproval}
            onChange={(event) => update('requireReviewApproval', event.target.checked)}
          />
          <span>Approve customer reviews before they go live</span>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.maintenanceMode}
            onChange={(event) => update('maintenanceMode', event.target.checked)}
          />
          <span>Maintenance mode (show a maintenance notice on the storefront)</span>
        </label>

        <h2 className="label mt-3">Tracking IDs</h2>
        <div className="field">
          <label htmlFor="metaPixelId">Meta Pixel ID</label>
          <input id="metaPixelId" className="input" value={form.metaPixelId} onChange={(event) => update('metaPixelId', event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ga4MeasurementId">GA4 measurement ID</label>
          <input
            id="ga4MeasurementId"
            className="input"
            value={form.ga4MeasurementId}
            onChange={(event) => update('ga4MeasurementId', event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="gtmId">Google Tag Manager ID</label>
          <input id="gtmId" className="input" value={form.gtmId} onChange={(event) => update('gtmId', event.target.value)} />
        </div>
        <p className="small muted">
          Conversions API token, Steadfast keys and SMTP credentials stay in environment variables — they are never
          editable from the browser.
        </p>
        <div className="stack" style={{ gap: '0.35rem' }}>
          <span className={`badge ${smtpConfigured ? 'badge--ok' : 'badge--warn'}`}>
            Gmail SMTP {smtpConfigured ? 'connected' : 'not configured'}
          </span>
          <span className={`badge ${steadfastConfigured ? 'badge--ok' : 'badge--warn'}`}>
            Steadfast API {steadfastConfigured ? 'connected' : 'not configured'}
          </span>
        </div>
      </section>

      <div className="stack" style={{ gap: '0.75rem' }}>
        {error ? <p className="alert alert--danger">{error}</p> : null}
        {message ? <p className="alert alert--ok">{message}</p> : null}
        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </form>
  )
}
