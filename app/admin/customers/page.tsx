import Link from 'next/link'
import { prisma } from '@/lib/db'
import { formatDate, formatMoney } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AdminCustomersPage({ searchParams }: { searchParams: { q?: string } }) {
  const where: any = {}
  if (searchParams.q) {
    where.OR = [
      { phone: { contains: searchParams.q } },
      { name: { contains: searchParams.q, mode: 'insensitive' } },
      { email: { contains: searchParams.q, mode: 'insensitive' } },
    ]
  }

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      _count: { select: { orders: true } },
      orders: { select: { grandTotal: true, status: true } },
    },
  })

  return (
    <>
      <div className="admin__topbar">
        <div>
          <div className="eyebrow">Sell</div>
          <h1 className="page-title mt-2">Customers</h1>
        </div>
        <form className="row gap-2">
          <input name="q" className="input" placeholder="Phone, name or email" defaultValue={searchParams.q || ''} style={{ maxWidth: 240 }} />
          <button type="submit" className="btn btn--sm">
            Search
          </button>
        </form>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>Orders</th>
              <th>Lifetime value</th>
              <th>Delivered</th>
              <th>Risk</th>
              <th>Joined</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => {
              const lifetime = customer.orders.reduce((sum, order) => sum + order.grandTotal, 0)
              const delivered = customer.orders.filter((order) => order.status === 'DELIVERED').length
              return (
                <tr key={customer.id}>
                  <td>
                    {customer.name || '—'}
                    {customer.email ? <div className="small muted">{customer.email}</div> : null}
                  </td>
                  <td className="mono">{customer.phone}</td>
                  <td>{customer._count.orders}</td>
                  <td>{formatMoney(lifetime)}</td>
                  <td>{delivered}</td>
                  <td>
                    {customer.isBlocked ? (
                      <span className="badge badge--danger">blocked</span>
                    ) : customer.riskScore >= 50 ? (
                      <span className="badge badge--warn">{customer.riskScore}</span>
                    ) : (
                      <span className="badge badge--ok">{customer.riskScore}</span>
                    )}
                  </td>
                  <td className="small muted">{formatDate(customer.createdAt)}</td>
                  <td>
                    <Link href={`/admin/customers/${customer.id}`} className="link-underline">
                      Open
                    </Link>
                  </td>
                </tr>
              )
            })}
            {!customers.length ? (
              <tr>
                <td colSpan={8} className="center muted">
                  No customers found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  )
}
