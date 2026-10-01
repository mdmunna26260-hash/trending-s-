import { CartProvider } from '@/components/CartProvider'
import { StorefrontFooter } from '@/components/StorefrontFooter'
import { StorefrontHeader } from '@/components/StorefrontHeader'
import { TrackingScripts } from '@/components/TrackingScripts'
import { getCategories, getSettings } from '@/lib/queries'

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()])

  if (settings.maintenanceMode) {
    return (
      <div className="container section container--narrow center">
        <div className="eyebrow">{settings.storeName}</div>
        <h1 className="display-2 mt-3">We are restocking</h1>
        <p className="lede mt-3">
          The storefront is temporarily closed for maintenance. Please check back shortly — orders already placed are
          unaffected.
        </p>
        <p className="mt-4">
          <a className="btn btn--ghost" href={`https://wa.me/${settings.whatsappNumber}`}>
            WhatsApp us
          </a>
        </p>
      </div>
    )
  }

  return (
    <CartProvider>
      <TrackingScripts settings={settings} />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <StorefrontHeader
        announcement={settings.announcement}
        categories={categories.map((category) => ({ name: category.name, slug: category.slug }))}
      />
      <main id="main" style={{ flex: 1 }}>
        {children}
      </main>
      <StorefrontFooter />
    </CartProvider>
  )
}
