'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useCart } from './CartProvider'

const NAV = [
  { href: '/shop', label: 'Shop all' },
  { href: '/category/shirts', label: 'Shirts' },
  { href: '/category/pants', label: 'Pants' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

export function StorefrontHeader({ categories }: { categories: Array<{ name: string; slug: string }> }) {
  const pathname = usePathname()
  const router = useRouter()
  const { cart } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const itemCount = cart?.totals.itemCount ?? 0

  return (
    <>
      <div className="announcement">Free delivery over ৳2,000 · Cash on delivery nationwide · Dhaka dispatch in 24h</div>
      <header className="site-header">
        <div className="container site-header__inner">
          <Link href="/" className="brand" aria-label="Home">
            RUVIO
          </Link>

          <nav className="nav" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="nav__link"
                aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="header-actions">
            <form
              className="searchbar hide-sm"
              role="search"
              onSubmit={(event) => {
                event.preventDefault()
                if (query.trim()) router.push(`/shop?q=${encodeURIComponent(query.trim())}`)
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search shirts, jeans…"
                aria-label="Search products"
              />
            </form>

            <Link href="/account" className="icon-btn" aria-label="Account">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 3.6-6.5 8-6.5S20 17 20 21" />
              </svg>
            </Link>

            <Link href="/cart" className="icon-btn relative" aria-label={`Cart, ${itemCount} items`}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d="M6 7h12l-1.2 12.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8Z" />
                <path d="M9 7V6a3 3 0 0 1 6 0v1" />
              </svg>
              {itemCount > 0 && <span className="icon-btn__badge">{itemCount}</span>}
            </Link>

            <button
              type="button"
              className="icon-btn"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
              style={{ display: 'grid' }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="mobile-menu" id="mobile-menu">
            <div className="container">
              <form
                className="searchbar mb-4"
                role="search"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (query.trim()) router.push(`/shop?q=${encodeURIComponent(query.trim())}`)
                }}
              >
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search products"
                  aria-label="Search products"
                />
              </form>
              {NAV.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
              {categories.map((category) => (
                <Link key={category.slug} href={`/category/${category.slug}`}>
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>
    </>
  )
}
