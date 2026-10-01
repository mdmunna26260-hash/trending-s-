import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { formatDateTime, formatMoney, srcSetFor } from '@/lib/utils'
import { OrderActions } from '@/components/admin/OrderActions'

export const dynamic = 'force-dynamic'

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { product: true } },
      statusHistory: { orderBy: { createdAt: 'asc' } },
      parcel: true,
      payments: true,
      customer: { include: { addresses: true, orders: { select: { id: true, status: true } } } },
      fraudChecks: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!order) notFound()

  return (
    <>
      <div className="admin__topbar">
        <div>
          <div className="eyebrow">
            <Link href="/admin/orders">Orders</Link> / {order.orderNumber}
          </div>
          <h1 className="page-title mt-2">{order.orderNumber}</h1>
          <p className="small muted mt-2">
            Placed {formatDateTime(order.createdAt)} · {order.paymentMethod} · {formatMoney(order.grandTotal)}
          </p>
        </div>
        <span
          className={`badge ${
            order.status === 'DELIVERED' ? 'badge--ok' : order.status === 'CANCELLED' ? 'badge--danger' : 'badge--info'
          }`}
        >
          {order.status.replace(/_/g, ' ').toLowerCase()}
        </span>
      </div>

      <OrderActions
        order={{
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          fraudStatus: order.fraudStatus,
          riskScore: order.riskScore,
          parcel: order.parcel
            ? {
                id: order.parcel.id,
                consignmentId: order.parcel.consignmentId,
                trackingCode: order.parcel.trackingCode,
                status: order.parcel.status,
                riderName: order.parcel.riderName,
                riderPhone: order.parcel.riderPhone,
                syncError: order.parcel.syncError,
              }
            : null,
          fraudChecks: order.fraudChecks.map((check) => ({
            provider: check.provider,
            result: check.result,
            score: check.score,
            summary: check.summary,
          })),
        }}
      />

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <div className="surface pad">
          <h2 className="label" style={{ marginBottom: '0.75rem' }}>
            Items
          </h2>
          <div className="stack" style={{ gap: '0.75rem' }}>
            {order.items.map((item) => (
              <div key={item.id} className="row gap-3">
                {item.imagePath ? (
                  <img
                    src={item.imagePath}
                    srcSet={srcSetFor(item.imagePath)}
                    sizes="56px"
                    alt={item.name}
                    width={56}
                    height={70}
                    loading="lazy"
                    style={{ objectFit: 'cover', borderRadius: 2 }}
                  />
                ) : null}
                <div className="grow">
                  <div style={{ fontSize: '0.92rem' }}>
                    {item.name}
                    {item.variantName ? ` · ${item.variantName}` : ''}
                  </div>
                  <div className="small muted">
                    {formatMoney(item.unitPrice)} × {item.quantity}
                    {item.isFreeGift ? ' · free gift' : ''}
                  </div>
                </div>
                <div className="small">{formatMoney(item.lineTotal)}</div>
              </div>
            ))}
          </div>

          <hr className="divider mt-4" />
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatMoney(order.subtotal)}</span>
          </div>
          {order.discountTotal ? (
            <div className="summary-row">
              <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
              <span>−{formatMoney(order.discountTotal)}</span>
            </div>
          ) : null}
          <div className="summary-row">
            <span>Delivery</span>
            <span>{formatMoney(order.shippingTotal)}</span>
          </div>
          {order.codFee ? (
            <div className="summary-row">
              <span>COD fee</span>
              <span>{formatMoney(order.codFee)}</span>
            </div>
          ) : null}
          <div className="summary-row summary-row--total">
            <span>Total</span>
            <span>{formatMoney(order.grandTotal)}</span>
          </div>
        </div>

        <div className="surface pad">
          <h2 className="label" style={{ marginBottom: '0.75rem' }}>
            Customer &amp; delivery
          </h2>
          <p style={{ fontSize: '0.92rem', lineHeight: 1.7 }}>
            {order.customerName}
            <br />
            {order.customerPhone}
            {order.customerEmail ? (
              <>
                <br />
                {order.customerEmail}
              </>
            ) : null}
            <br />
            {order.shippingAddress}
            <br />
            {order.area ? `${order.area}, ` : ''}
            {order.city}, {order.district}
            {order.postcode ? ` — ${order.postcode}` : ''}
          </p>
          {order.notes ? (
            <p className="alert alert--info mt-3">
              <strong>Note:</strong> {order.notes}
            </p>
          ) : null}

          <h2 className="label mt-5" style={{ marginBottom: '0.5rem' }}>
            Risk signals
          </h2>
          <div className="stack" style={{ gap: '0.4rem' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="small">Risk score</span>
              <span className="small">{order.riskScore}/100</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="small">Fraud verdict</span>
              <span className={`badge ${order.fraudStatus === 'PASSED' ? 'badge--ok' : 'badge--danger'}`}>
                {order.fraudStatus.toLowerCase()}
              </span>
            </div>
            {order.fraudChecks.map((check, index) => (
              <div key={index} className="small muted">
                {check.provider}: {check.result.toLowerCase()} ({check.score}) — {check.summary}
              </div>
            ))}
            <div className="small muted">IP: {order.ipAddress || 'n/a'}</div>
            <div className="small muted">
              UTM: {order.utmSource || '—'} / {order.utmMedium || '—'} / {order.utmCampaign || '—'}
            </div>
          </div>

          {order.customer ? (
            <p className="small muted mt-4">
              {order.customer.orders.length} lifetime order(s) ·{' '}
              <Link href={`/admin/customers/${order.customer.id}`} className="link-underline">
                customer profile
              </Link>
            </p>
          ) : (
            <p className="small muted mt-4">Guest checkout (no account).</p>
          )}
        </div>

        <div className="surface pad">
          <h2 className="label" style={{ marginBottom: '0.75rem' }}>
            Status history
          </h2>
          <div className="stack" style={{ gap: '0.5rem' }}>
            {order.statusHistory.map((entry) => (
              <div key={entry.id} className="small">
                <strong>{entry.status.replace(/_/g, ' ').toLowerCase()}</strong> · {formatDateTime(entry.createdAt)} ·{' '}
                {entry.actorType}
                {entry.note ? <div className="muted">{entry.note}</div> : null}
              </div>
            ))}
          </div>

          <h2 className="label mt-5" style={{ marginBottom: '0.5rem' }}>
            Payments
          </h2>
          {order.payments.map((payment) => (
            <div key={payment.id} className="small muted">
              {payment.method} · {formatMoney(payment.amount)} · {payment.status.toLowerCase()}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
