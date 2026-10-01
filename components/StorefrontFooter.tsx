import Link from 'next/link'
import { getCategories, getSettings } from '@/lib/queries'

export async function StorefrontFooter() {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()])

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          <div>
            <div className="brand" style={{ color: '#fff', marginBottom: '1rem' }}>
              {settings.storeName}
            </div>
            <p style={{ maxWidth: '34ch', color: 'var(--stone-400)', fontSize: '0.9rem' }}>
              {settings.tagline} Made in the same factories as the houses you know — sold here, without the journey.
            </p>
          </div>

          <div>
            <h4>Shop</h4>
            <ul className="stack" style={{ gap: '0.5rem', fontSize: '0.88rem' }}>
              <li>
                <Link href="/shop">All products</Link>
              </li>
              {categories.slice(0, 4).map((category) => (
                <li key={category.id}>
                  <Link href={`/category/${category.slug}`}>{category.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4>Help</h4>
            <ul className="stack" style={{ gap: '0.5rem', fontSize: '0.88rem' }}>
              <li>
                <Link href="/account">Track order</Link>
              </li>
              <li>
                <Link href="/about">About us</Link>
              </li>
              <li>
                <Link href="/contact">Contact</Link>
              </li>
              <li>
                <Link href="/admin/login">Admin</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4>Stay in the loop</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--stone-400)', marginBottom: '0.75rem' }}>
              New drops, restocks and members-only pricing.
            </p>
            <div className="row" style={{ gap: '0.5rem' }}>
              <a className="icon-btn" href={`https://wa.me/${settings.whatsappNumber}`} aria-label="WhatsApp" style={{ borderColor: 'rgba(255,255,255,.2)' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.2 1.2-1.9 1.2-.6 0-1.9-.3-3.7-1.6-2-1.5-3.2-3.6-3.3-3.8-.4-.7-.6-1.4-.3-2.2.2-.5.7-1 1-1.2.2-.1.6-.1.8.1.2.2.8 1.3.9 1.5.1.2 0 .4-.1.6l-.4.5c-.1.2-.2.3 0 .6.2.4.8 1.2 1.5 1.8.9.8 1.6 1 1.9 1.1.2.1.4 0 .5-.1l.7-.8c.2-.2.4-.2.6-.1l1.5.7c.2.1.3.3.3.5s0 .6-.1.9Z" />
                </svg>
              </a>
              <a className="icon-btn" href="https://instagram.com" aria-label="Instagram" style={{ borderColor: 'rgba(255,255,255,.2)' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a className="icon-btn" href="https://facebook.com" aria-label="Facebook" style={{ borderColor: 'rgba(255,255,255,.2)' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M13.5 22v-8h2.8l.4-3.2h-3.2V8.6c0-.9.3-1.6 1.7-1.6h1.6V4.2c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.6H7.6V14h2.8v8h3.1Z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="site-footer__bottom">
          <span>
            © {new Date().getFullYear()} {settings.storeName}. All rights reserved.
          </span>
          <span>
            {settings.address} · {settings.supportPhone}
          </span>
        </div>
      </div>
    </footer>
  )
}
