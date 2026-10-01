import { prisma } from '@/lib/db'
import { formatMoney } from '@/lib/utils'
import { RecoverButton } from '@/components/admin/RecoverButton'

export const dynamic = 'force-dynamic'

export default async function AdminMarketingPage() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [carts, emails, orders] = await Promise.all([
    prisma.cart.findMany({
      where: { items: { some: {} }, lastActivityAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      orderBy: { lastActivityAt: 'asc' },
      take: 50,
      include: {
        customer: { select: { name: true, phone: true, email: true } },
        items: { include: { product: { select: { name: true, price: true } }, variant: { select: { name: true } } } },
      },
    }),
    prisma.notificationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: { order: { select: { orderNumber: true } } },
    }),
    prisma.order.groupBy({
      by: ['utmSource'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      _sum: { grandTotal: true },
    }),
  ])

  const recoverableValue = carts.reduce(
    (sum, cart) => sum + cart.items.reduce((line, item) => line + (item.isFreeGift ? 0 : item.unitPrice * item.quantity), 0),
    0,
  )

  return (
    <>
      <div className="admin__topbar">
        <div>
          <div className="eyebrow">Growth</div>
          <h1 className="page-title mt-2">Marketing</h1>
        </div>
        <span className="badge">{formatMoney(recoverableValue)} recoverable</span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <div className="surface pad">
          <h2 className="label" style={{ marginBottom: '0.75rem' }}>
            Abandoned carts · {carts.length}
          </h2>
          <p className="small muted mb-4">
            Carts idle for more than 24 hours. Recovery emails include the customer and item details and a resume link.
          </p>
          <RecoverButton />
        </div>

        <div className="surface pad">
          <h2 className="label" style={{ marginBottom: '0.75rem' }}>
            Acquisition · last 30 days
          </h2>
          <div className="stack" style={{ gap: '0.5rem' }}>
            {orders.map((row) => (
              <div key={row.utmSource || 'direct'} className="row" style={{ justifyContent: 'space-between' }}>
                <span className="small">{row.utmSource || 'direct / none'}</span>
                <span className="small muted">
                  {row._count._all} orders · {formatMoney(row._sum.grandTotal ?? 0)}
                </span>
              </div>
            ))}
            {!orders.length ? <p className="small muted">No attributed orders yet.</p> : null}
          </div>
        </div>

        <div className="surface pad">
          <h2 className="label" style={{ marginBottom: '0.75rem' }}>
            Email log
          </h2>
          <div className="stack" style={{ gap: '0.4rem' }}>
            {emails.map((email) => (
              <div key={email.id} className="row" style={{ justifyContent: 'space-between', gap: '0.75rem' }}>
                <span className="small">
                  {email.template} → {email.recipient}
                  {email.order ? <span className="muted"> ({email.order.orderNumber})</span> : null}
                </span>
                <span
                  className={`badge ${
                    email.status === 'SENT' ? 'badge--ok' : email.status === 'FAILED' ? 'badge--danger' : 'badge--warn'
                  }`}
                >
                  {email.status.toLowerCase()}
                </span>
              </div>
            ))}
            {!emails.length ? <p className="small muted">No emails sent yet.</p> : null}
          </div>
          <p className="small muted mt-4">
            Server-side conversion events (Meta Conversions API / GA4) are forwarded from the same order pipeline with
            matching event IDs for deduplication.
          </p>
        </div>
      </div>
    </>
  )
}
