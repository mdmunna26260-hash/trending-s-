import Link from 'next/link'
import { getDashboardStats } from '@/lib/queries'
import { formatDate, formatMoney } from '@/lib/utils'
import { RecoverButton } from '@/components/admin/RecoverButton'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const stats = await getDashboardStats()

  const statusBadge = (status: string) =>
    status === 'DELIVERED'
      ? 'badge--ok'
      : status === 'CANCELLED' || status === 'RETURNED'
        ? 'badge--danger'
        : status === 'PENDING'
          ? 'badge--warn'
          : 'badge--info'

  const maxRevenue = Math.max(1, ...stats.revenueByDay.map(([, value]) => value))

  return (
    <>
      <div className="admin__topbar">
        <div>
          <div className="eyebrow">Dashboard</div>
          <h1 className="page-title mt-2">Store overview</h1>
        </div>
        <div className="row gap-2">
          <Link href="/admin/orders" className="btn btn--sm">
            Manage orders
          </Link>
          <Link href="/admin/products/new" className="btn btn--ghost btn--sm">
            Add product
          </Link>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-card__label">Delivered revenue</span>
          <span className="stat-card__value">{formatMoney(stats.totalRevenue)}</span>
          <span className="small muted">All time</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">This month</span>
          <span className="stat-card__value">{formatMoney(stats.monthRevenue)}</span>
          <span className="small muted">All statuses</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Pending orders</span>
          <span className="stat-card__value">{stats.pendingCount}</span>
          <span className="small muted">Need confirmation</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Customers</span>
          <span className="stat-card__value">{stats.customerCount}</span>
          <span className="small muted">Registered accounts</span>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* -------------------------------------------------------- alerts -- */}
        <div className="surface pad stack" style={{ gap: '0.75rem' }}>
          <h2 className="label">Attention needed</h2>
          <Link href="/admin/orders" className="row" style={{ justifyContent: 'space-between' }}>
            <span>Pending orders</span>
            <span className={`badge ${stats.pendingCount ? 'badge--warn' : 'badge--ok'}`}>{stats.pendingCount}</span>
          </Link>
          <Link href="/admin/inventory" className="row" style={{ justifyContent: 'space-between' }}>
            <span>Low / out of stock</span>
            <span className={`badge ${stats.lowStock ? 'badge--danger' : 'badge--ok'}`}>{stats.lowStock}</span>
          </Link>
          <Link href="/admin/fraud" className="row" style={{ justifyContent: 'space-between' }}>
            <span>Orders flagged for fraud review</span>
            <span className={`badge ${stats.fraudAlerts ? 'badge--danger' : 'badge--ok'}`}>{stats.fraudAlerts}</span>
          </Link>
          <Link href="/admin/marketing" className="row" style={{ justifyContent: 'space-between' }}>
            <span>Abandoned carts (24h+)</span>
            <span className={`badge ${stats.abandonedCarts ? 'badge--info' : 'badge--ok'}`}>{stats.abandonedCarts}</span>
          </Link>
          <Link href="/admin/reviews" className="row" style={{ justifyContent: 'space-between' }}>
            <span>Reviews awaiting approval</span>
            <span className={`badge ${stats.pendingReviews ? 'badge--warn' : 'badge--ok'}`}>{stats.pendingReviews}</span>
          </Link>
        </div>

        {/* -------------------------------------------------------- orders -- */}
        <div className="surface pad">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h2 className="label">Latest orders</h2>
            <Link href="/admin/orders" className="link-underline">
              View all
            </Link>
          </div>
          <table className="table table--compact">
            <thead>
              <tr>
                <th>Order</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link href={`/admin/orders/${order.id}`} className="mono">
                      {order.orderNumber}
                    </Link>
                    <div className="small muted">{formatDate(order.createdAt)}</div>
                  </td>
                  <td>{formatMoney(order.grandTotal)}</td>
                  <td>
                    <span className={`badge ${statusBadge(order.status)}`}>{order.status.replace(/_/g, ' ').toLowerCase()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ------------------------------------------------------- revenue -- */}
        <div className="surface pad">
          <h2 className="label" style={{ marginBottom: '0.75rem' }}>
            Revenue · last 30 days
          </h2>
          <div className="row" style={{ alignItems: 'flex-end', gap: 4, height: 140 }}>
            {stats.revenueByDay.slice(-30).map(([day, value]) => (
              <div
                key={day}
                title={`${day}: ${formatMoney(value)}`}
                style={{
                  flex: 1,
                  height: `${Math.max(4, (value / maxRevenue) * 100)}%`,
                  background: 'var(--ink-900)',
                  borderRadius: '2px 2px 0 0',
                  minWidth: 3,
                }}
              />
            ))}
          </div>
          <p className="small muted mt-3">Confirmed and delivered orders only.</p>
        </div>

        {/* --------------------------------------------------- top products -- */}
        <div className="surface pad">
          <h2 className="label" style={{ marginBottom: '0.75rem' }}>
            Best sellers
          </h2>
          <div className="stack" style={{ gap: '0.6rem' }}>
            {stats.topProducts.map((product) => (
              <div key={product.name} className="row" style={{ justifyContent: 'space-between' }}>
                <span className="small">{product.name}</span>
                <span className="small muted">
                  {product._sum.quantity} sold · {formatMoney(product._sum.lineTotal ?? 0)}
                </span>
              </div>
            ))}
            {!stats.topProducts.length ? <p className="small muted">No sales yet.</p> : null}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------- marketing hook -- */}
      <div className="surface pad">
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="label">Abandoned cart recovery</h2>
            <p className="small muted mt-2">
              {stats.abandonedCarts} cart(s) have been idle for more than 24 hours. Send a recovery email with the
              customer and item details.
            </p>
          </div>
          <Link href="/admin/marketing" className="btn btn--sm">
            Open marketing
          </Link>
        </div>
        <div className="mt-4">
          <RecoverButton />
        </div>
      </div>
    </>
  )
}
