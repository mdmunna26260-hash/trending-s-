import Link from 'next/link'
import { getSettings } from '@/lib/queries'

export const metadata = { title: 'About us' }

export default async function AboutPage() {
  const settings = await getSettings()

  return (
    <div className="container section container--narrow">
      <div className="eyebrow">About</div>
      <h1 className="display-2 mt-3">Same factories. Priced without the journey.</h1>

      <div className="stack mt-5" style={{ gap: '1.25rem' }}>
        <p className="lede">
          We buy the pieces that never leave the country. Every production run for a major label makes a few extra pieces
          beyond the order — the leftovers stay here, with the brand&apos;s own labels sewn in, and that is what we sell.
        </p>
        <p>
          No importer. No import duty. No retail markup abroad. What is left is a shirt or a pair of jeans made in the
          same factories you already know, at roughly a third of what it would cost in a flagship store — and a limited
          run, because the run itself is limited.
        </p>
        <p>
          We are a small team in Dhaka. Every order is checked by hand, packed by hand, and dispatched within 24 hours
          with a courier partner you can track from the moment the parcel is created.
        </p>
      </div>

      <div className="stat-strip mt-6">
        {[
          { value: '24h', label: 'Dispatch' },
          { value: '≈⅓', label: 'Of retail' },
          { value: '7-day', label: 'Exchange' },
          { value: '100%', label: 'Authentic labels' },
        ].map((stat) => (
          <div className="stat-strip__item" key={stat.label}>
            <div className="stat-strip__value">{stat.value}</div>
            <div className="eyebrow">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="surface pad mt-6">
        <h2 className="label">Contact</h2>
        <p className="mt-3">
          {settings.address}
          <br />
          Phone / WhatsApp: {settings.supportPhone}
          <br />
          Email: {settings.supportEmail}
        </p>
        <Link href="/shop" className="btn mt-4">
          Shop the collection
        </Link>
      </div>
    </div>
  )
}
