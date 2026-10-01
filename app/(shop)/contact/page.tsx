import { getSettings } from '@/lib/queries'

export const metadata = { title: 'Contact' }

export default async function ContactPage() {
  const settings = await getSettings()

  return (
    <div className="container section container--narrow">
      <div className="eyebrow">Contact</div>
      <h1 className="display-2 mt-3">Talk to us</h1>
      <p className="lede mt-4">
        Sizing, stock, a bundle you want to build, or an update on an existing order — we answer faster on WhatsApp.
      </p>

      <div className="grid mt-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <div className="surface pad">
          <h2 className="label">WhatsApp</h2>
          <p className="mt-3">Fastest response, 10am – 10pm.</p>
          <a className="btn btn--sm mt-3" href={`https://wa.me/${settings.whatsappNumber}`}>
            Message us
          </a>
        </div>
        <div className="surface pad">
          <h2 className="label">Phone</h2>
          <p className="mt-3">{settings.supportPhone}</p>
        </div>
        <div className="surface pad">
          <h2 className="label">Email</h2>
          <p className="mt-3">{settings.supportEmail}</p>
        </div>
        <div className="surface pad">
          <h2 className="label">Address</h2>
          <p className="mt-3">{settings.address}</p>
        </div>
      </div>

      <div className="surface pad mt-6">
        <h2 className="label">Track an order</h2>
        <p className="mt-3">
          Have your order number (for example <span className="mono">RVDEMO1000</span>) and the phone number you used
          ready.
        </p>
        <a className="btn btn--ghost btn--sm mt-3" href="/order/RVDEMO1000">
          Open order tracking
        </a>
      </div>
    </div>
  )
}
