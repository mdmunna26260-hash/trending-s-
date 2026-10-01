import Link from 'next/link'
import { prisma } from '@/lib/db'
import { formatDate, formatMoney } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PARCEL_CREATED', 'RIDER_ASSIGNED', 'DELIVERED', 'CANCELLED', 'RETURNED']

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string; page?: string }
}) {
  const page = Math.max(1, Number(searchParams.page || 1))
  const perPage = 25

  const where: any = {}
  if (searchParams.status && STATUSES.includes(searchParams.status)) where.status = searchParams.status
  if (searchParams.q) {
    where.OR = [
      { orderNumber: { contains: searchParams.q, mode: 'insensitive' } },
      { customerPhone: { contains: searchParams.q } },
      { customerName: { contains: searchParams.q, mode: 'insensitive' } },
    ]
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { items: true, parcel: true, customer: { select: { name: true } } },
    }),
    prisma.order.count({ where }),
  ])

  const pageCount = Math.max(1, Math.ceil(total / perPage))
  const buildHref = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams()
    if (searchParams.status) params.set('status', searchParams.status)
    if (searchParams.q) params.set('q', searchParams.q)
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    return `/admin/orders?${params.toString()}`
  }

  return (
    <>
      <div className="admin__topbar">
        <div>
          <div className="eyebrow">Sell</div>
          <h1 className="page-title mt-2">Orders</h1>
        </div>
        <span className="badge">{total} total</span>
      </div>

      <form className="surface pad row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
        <input
          name="q"
          className="input"
          placeholder="Order number, phone or name"
          defaultValue={searchParams.q || ''}
          style={{ maxWidth: 280 }}
        />
        <select name="status" className="select" defaultValue={searchParams.status || ''} style={{ maxWidth: 200 }}>
          <option value="">All statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.replace(/_/g, ' ').toLowerCase()}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn--sm">
          Filter
        </button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Courier</th>
              <th>Status</th>
              <th>Placed</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <Link href={`/admin/orders/${order.id}`} className="mono">
                    {order.orderNumber}
                  </Link>
                </td>
                <td>
                  <div>{order.customerName}</div>
                  <div className="small muted">{order.customerPhone}</div>
                </td>
                <td>
                  {order.items.length}
                  <div className="small muted">
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)} pcs
                  </div>
                </td>
                <td>{formatMoney(order.grandTotal)}</td>
                <td>
                  <span className="badge">{order.paymentMethod}</span>
                </td>
                <td>
                  {order.parcel ? (
                    <span className="badge badge--info">{order.parcel.consignmentId || order.parcel.trackingCode}</span>
                  ) : (
                    <span className="small muted">—</span>
                  )}
                </td>
                <td>
                  <span
                    className={`badge ${
                      order.status === 'DELIVERED'
                        ? 'badge--ok'
                        : order.status === 'CANCELLED' || order.status === 'RETURNED'
                          ? 'badge--danger'
                          : order.status === 'PENDING'
                            ? 'badge--warn'
                            : 'badge--info'
                    }`}
                  >
                    {order.status.replace(/_/g, ' ').toLowerCase()}
                  </span>
                  {order.fraudStatus === 'REVIEW' || order.fraudStatus === 'BLOCKED' ? (
                    <span className="badge badge--danger" style={{ marginLeft: 4 }}>
                      fraud
                    </span>
                  ) : null}
                </td>
                <td className="small muted">{formatDate(order.createdAt)}</td>
                <td>
                  <Link href={`/admin/orders/${order.id}`} className="link-underline">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {!orders.length ? (
              <tr>
                <td colSpan={9} className="center muted">
                  No orders match this filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {pageCount > 1 ? (
        <div className="pagination">
          {page > 1 ? (
            <Link href={buildHref({ page: String(page - 1) })}>Previous</Link>
          ) : (
            <span>Previous</span>
          )}
          {Array.from({ length: Math.min(pageCount, 10) }, (_, index) => index + 1).map((value) => (
            <Link key={value} href={buildHref({ page: String(value) })} aria-current={value === page ? 'page' : undefined}>
              {value}
            </Link>
          ))}
          {page < pageCount ? <Link href={buildHref({ page: String(page + 1) })}>Next</Link> : <span>Next</span>}
        </div>
      ) : null}
    </>
  )
}
