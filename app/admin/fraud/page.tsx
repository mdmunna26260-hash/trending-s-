import { prisma } from '@/lib/db'
import { formatDateTime, formatMoney } from '@/lib/utils'
import { BlacklistManager } from '@/components/admin/BlacklistManager'

export const dynamic = 'force-dynamic'

export default async function AdminFraudPage() {
  const [checks, flaggedOrders, blacklist] = await Promise.all([
    prisma.fraudCheck.findMany({
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: { order: { select: { orderNumber: true } } },
    }),
    prisma.order.findMany({
      where: { fraudStatus: { in: ['REVIEW', 'BLOCKED'] } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { customer: { select: { phone: true } } },
    }),
    prisma.blacklist.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
  ])

  return (
    <>
      <div className="admin__topbar">
        <div>
          <div className="eyebrow">Operations</div>
          <h1 className="page-title mt-2">Fraud &amp; blacklist</h1>
        </div>
        <span className={`badge ${flaggedOrders.length ? 'badge--danger' : 'badge--ok'}`}>
          {flaggedOrders.length} flagged orders
        </span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <div className="surface pad">
          <h2 className="label" style={{ marginBottom: '0.75rem' }}>
            Flagged orders
          </h2>
          <div className="stack" style={{ gap: '0.5rem' }}>
            {flaggedOrders.map((order) => (
              <div key={order.id} className="row" style={{ justifyContent: 'space-between', gap: '0.75rem' }}>
                <span className="small">
                  <a href={`/admin/orders/${order.id}`} className="mono">
                    {order.orderNumber}
                  </a>
                  <div className="muted">
                    {order.customerName} · {order.customerPhone} · risk {order.riskScore}
                  </div>
                </span>
                <span className={`badge ${order.fraudStatus === 'BLOCKED' ? 'badge--danger' : 'badge--warn'}`}>
                  {order.fraudStatus.toLowerCase()}
                </span>
              </div>
            ))}
            {!flaggedOrders.length ? <p className="small muted">Nothing flagged right now.</p> : null}
          </div>

          <h2 className="label mt-5" style={{ marginBottom: '0.5rem' }}>
            How orders are scored
          </h2>
          <ul className="stack small muted" style={{ gap: '0.25rem' }}>
            <li>· Local blacklist match (phone, email, IP, address keyword, customer)</li>
            <li>· Customer order history (cancellation / return rate)</li>
            <li>· Steadfast courier fraud check (when API keys are configured)</li>
            <li>· External fraud provider (FraudAPI_URL, when configured)</li>
            <li>· Order velocity per phone + IP within the hour</li>
            <li>· Heuristics: high first-order value, high item count</li>
          </ul>
        </div>

        <div className="surface pad">
          <h2 className="label" style={{ marginBottom: '0.75rem' }}>
            Recent fraud checks
          </h2>
          <div className="stack" style={{ gap: '0.4rem' }}>
            {checks.map((check) => (
              <div key={check.id} className="small" style={{ lineHeight: 1.5 }}>
                <span className={`badge ${check.result === 'PASSED' ? 'badge--ok' : check.result === 'REVIEW' ? 'badge--warn' : 'badge--danger'}`}>
                  {check.result.toLowerCase()}
                </span>{' '}
                {check.provider} · score {check.score}
                {check.order ? <span className="muted"> · {check.order.orderNumber}</span> : null}
                <div className="muted">{check.summary}</div>
              </div>
            ))}
            {!checks.length ? <p className="small muted">No checks recorded yet.</p> : null}
          </div>
        </div>
      </div>

      <BlacklistManager
        entries={blacklist.map((entry) => ({
          id: entry.id,
          type: entry.type,
          value: entry.value,
          reason: entry.reason,
          severity: entry.severity,
          isActive: entry.isActive,
          expiresAt: entry.expiresAt?.toISOString() ?? null,
          createdAt: entry.createdAt.toISOString(),
        }))}
      />

      <p className="small muted">
        Total exposure of blocked/returned orders in this list:{' '}
        {formatMoney(flaggedOrders.reduce((sum, order) => sum + order.grandTotal, 0))} · last check{' '}
        {checks[0] ? formatDateTime(checks[0].createdAt) : 'n/a'}
      </p>
    </>
  )
}
