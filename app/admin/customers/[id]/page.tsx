import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { formatDate, formatDateTime, formatMoney } from '@/lib/utils'
import { CustomerActions } from '@/components/admin/CustomerActions'

export const dynamic = 'force-dynamic'

export default async function AdminCustomerDetailPage({ params }: { params: { id: string } }) {
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      addresses: true,
      orders: { orderBy: { createdAt: 'desc' }, include: { items: true, parcel: true } },
      reviews: { include: { product: { select: { name: true } } } },
    },
  })
  if (!customer) notFound()

  const lifetime = customer.orders.reduce((sum, order) => sum + order.grandTotal, 0)
  const delivered = customer.orders.filter((order) => order.status === 'DELIVERED').length
  const cancelled = customer.orders.filter((order) => order.status === 'CANCELLED' || order.status === 'RETURNED').length

  return (
    <>
      <div className="admin__topbar">
        <div>
          <div className="eyebrow">
            <Link href="/admin/customers">Customers</Link> / {customer.phone}
          </div>
          <h1 className="page-title mt-2">{customer.name || customer.phone}</h1>
          <p className="small muted mt-2">
            {customer.phone} {customer.email ? `· ${customer.email}` : ''} · joined {formatDate(customer.createdAt)}
          </p>
        </div>
        <CustomerActions
          customerId={customer.id}
          isBlocked={customer.isBlocked}
          blockReason={customer.blockReason}
          phone={customer.phone}
        />
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-card__label">Lifetime value</span>
          <span className="stat-card__value">{formatMoney(lifetime)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Orders</span>
          <span className="stat-card__value">{customer.orders.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Delivered</span>
          <span className="stat-card__value">{delivered}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Cancelled / returned</span>
          <span className="stat-card__value">{cancelled}</span>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        <div className="surface pad">
          <h2 className="label" style={{ marginBottom: '0.75rem' }}>
            Orders
          </h2>
          <table className="table table--compact">
            <thead>
              <tr>
                <th>Order</th>
                <th>Total</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {customer.orders.map((order) => (
                <tr key={order.id}>
                  <td className="mono">{order.orderNumber}</td>
                  <td>{formatMoney(order.grandTotal)}</td>
                  <td>
                    <span className="badge">{order.status.replace(/_/g, ' ').toLowerCase()}</span>
                  </td>
                  <td>
                    <Link href={`/admin/orders/${order.id}`} className="link-underline">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {!customer.orders.length ? (
                <tr>
                  <td colSpan={4} className="center muted">
                    No orders yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="surface pad">
          <h2 className="label" style={{ marginBottom: '0.75rem' }}>
            Addresses
          </h2>
          <div className="stack" style={{ gap: '0.75rem' }}>
            {customer.addresses.map((address) => (
              <div key={address.id} className="small" style={{ lineHeight: 1.7 }}>
                <strong>{address.label}</strong> {address.isDefault ? <span className="badge badge--ok">default</span> : null}
                <br />
                {address.recipient} · {address.phone}
                <br />
                {address.address}, {address.area ? `${address.area}, ` : ''}
                {address.city}, {address.district}
              </div>
            ))}
            {!customer.addresses.length ? <p className="small muted">No saved addresses.</p> : null}
          </div>

          <h2 className="label mt-5" style={{ marginBottom: '0.5rem' }}>
            Reviews
          </h2>
          <div className="stack" style={{ gap: '0.5rem' }}>
            {customer.reviews.map((review) => (
              <div key={review.id} className="small">
                {'★'.repeat(review.rating)} — {review.product.name}
                <div className="muted">{review.body}</div>
              </div>
            ))}
            {!customer.reviews.length ? <p className="small muted">No reviews written.</p> : null}
          </div>
        </div>
      </div>
    </>
  )
}
