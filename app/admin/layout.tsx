import { redirect } from 'next/navigation'
import { getAdmin } from '@/lib/auth'
import { AdminNav } from '@/components/admin/AdminNav'
import { getSettings } from '@/lib/queries'

export const metadata = { title: { default: 'Admin', template: '%s · Admin' } }
export const dynamic = 'force-dynamic'

const NAV = [
  { href: '/admin', label: 'Dashboard', group: 'Overview' },
  { href: '/admin/orders', label: 'Orders', group: 'Sell' },
  { href: '/admin/products', label: 'Products', group: 'Catalogue' },
  { href: '/admin/categories', label: 'Categories', group: 'Catalogue' },
  { href: '/admin/inventory', label: 'Inventory', group: 'Catalogue' },
  { href: '/admin/coupons', label: 'Coupons & discounts', group: 'Catalogue' },
  { href: '/admin/customers', label: 'Customers', group: 'Sell' },
  { href: '/admin/reviews', label: 'Reviews', group: 'Sell' },
  { href: '/admin/marketing', label: 'Marketing', group: 'Growth' },
  { href: '/admin/courier', label: 'Courier', group: 'Operations' },
  { href: '/admin/fraud', label: 'Fraud & blacklist', group: 'Operations' },
  { href: '/admin/settings', label: 'Settings', group: 'Operations' },
  { href: '/admin/users', label: 'Admin users', group: 'Operations' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin()
  if (!admin) {
    // middleware.ts has already redirected unauthenticated visitors to
    // /admin/login — render the login screen standalone (no admin shell).
    return <>{children}</>
  }
  const settings = await getSettings()
  const groups = NAV.reduce<Record<string, typeof NAV>>((accumulator, item) => {
    accumulator[item.group] = [...(accumulator[item.group] || []), item]
    return accumulator
  }, {})

  return (
    <div className="admin">
      <aside className="admin__sidebar">
        <div>
          <div className="admin__brand">{settings.storeName}</div>
          <div className="small" style={{ color: 'var(--stone-500)', marginTop: '0.35rem' }}>
            Admin panel
          </div>
        </div>

        <AdminNav groups={groups} />

        <div style={{ marginTop: 'auto' }}>
          <div className="small" style={{ color: 'var(--stone-500)' }}>
            Signed in as
          </div>
          <div style={{ color: '#fff', fontSize: '0.9rem' }}>{admin.name}</div>
          <div className="small" style={{ color: 'var(--stone-500)' }}>
            {admin.role}
          </div>
        </div>
      </aside>

      <main className="admin__main">{children}</main>
    </div>
  )
}
