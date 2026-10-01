'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

export function AdminNav({
  groups,
}: {
  groups: Record<string, Array<{ href: string; label: string; group: string }>>
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href))

  return (
    <>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        style={{ color: 'var(--stone-200)', borderColor: 'rgba(255,255,255,.2)', display: 'grid' }}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {open ? 'Close menu' : 'Menu'}
      </button>

      <nav className={`admin__nav ${open ? '' : 'hide-sm'}`} style={open ? { display: 'grid' } : undefined} aria-label="Admin">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <div className="admin__nav-group">{group}</div>
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <button
        type="button"
        className="btn btn--ghost btn--sm"
        style={{ color: 'var(--stone-200)', borderColor: 'rgba(255,255,255,.2)' }}
        onClick={async () => {
          await fetch('/api/auth/admin/logout', { method: 'POST' })
          router.push('/admin/login')
          router.refresh()
        }}
      >
        Log out
      </button>
    </>
  )
}
