import { SettingsForm } from '@/components/admin/SettingsForm'
import { getSettings } from '@/lib/settings'
import { hasSmtp, hasSteadfast, env } from '@/lib/env'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const settings = await getSettings()

  return (
    <>
      <div className="admin__topbar">
        <div>
          <div className="eyebrow">Operations</div>
          <h1 className="page-title mt-2">Settings</h1>
        </div>
        <span className="badge">{settings.storeName}</span>
      </div>

      <SettingsForm settings={settings} smtpConfigured={hasSmtp} steadfastConfigured={hasSteadfast} />

      <div className="surface pad stack" style={{ gap: '0.75rem' }}>
        <h2 className="label">Environment &amp; secrets</h2>
        <p className="small muted">
          The following values are read from environment variables only. They are never sent to the browser and cannot be
          edited from this screen.
        </p>
        <table className="table table--compact">
          <thead>
            <tr>
              <th>Variable</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['DATABASE_URL', env.DATABASE_URL ? 'configured' : 'missing'],
              ['AUTH_SECRET', env.AUTH_SECRET.length >= 32 ? 'configured' : 'too short'],
              ['STEADFAST_API_KEY', env.STEADFAST_API_KEY ? 'configured' : 'not set'],
              ['STEADFAST_SECRET_KEY', env.STEADFAST_SECRET_KEY ? 'configured' : 'not set'],
              ['SMTP_USER', env.SMTP_USER ? 'configured' : 'not set'],
              ['SMTP_PASS', env.SMTP_PASS ? 'configured' : 'not set'],
              ['META_CONVERSIONS_API_TOKEN', env.META_CONVERSIONS_API_TOKEN ? 'configured' : 'not set'],
              ['NEXT_PUBLIC_META_PIXEL_ID', process.env.NEXT_PUBLIC_META_PIXEL_ID ? 'configured' : 'not set'],
              ['NEXT_PUBLIC_GA4_MEASUREMENT_ID', process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ? 'configured' : 'not set'],
              ['GA4_API_SECRET', process.env.GA4_API_SECRET ? 'configured' : 'not set'],
            ].map(([key, status]) => (
              <tr key={key}>
                <td className="mono">{key}</td>
                <td>
                  <span className={`badge ${status === 'configured' ? 'badge--ok' : 'badge--warn'}`}>{status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
