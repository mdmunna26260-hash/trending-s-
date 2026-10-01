import Link from 'next/link'
import { prisma } from '@/lib/db'
import { formatDateTime, formatMoney } from '@/lib/utils'
import { CourierPanel } from '@/components/admin/CourierPanel'
import { steadfastConfigured } from '@/lib/couriers/steadfast'

export const dynamic = 'force-dynamic'

export default async function AdminCourierPage() {
  const parcels = await prisma.parcel.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
        order: { select: { orderNumber: true, status: true, customerPhone: true, customerName: true, grandTotal: true } },
      },
  })

  return (
    <>
      <div className="admin__topbar">
        <div>
          <div className="eyebrow">Operations</div>
          <h1 className="page-title mt-2">Courier · Steadfast</h1>
        </div>
        <span className={`badge ${steadfastConfigured ? 'badge--ok' : 'badge--warn'}`}>
          {steadfastConfigured ? 'API connected' : 'API keys missing'}
        </span>
      </div>

      <CourierPanel />

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Consignment</th>
              <th>Tracking</th>
              <th>Status</th>
              <th>Rider</th>
              <th>Last sync</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {parcels.map((parcel) => (
              <tr key={parcel.id}>
                <td>
                  <Link href={`/admin/orders/${parcel.orderId}`} className="mono">
                    {parcel.order.orderNumber}
                  </Link>
                  <div className="small muted">
                    {parcel.order.customerName} · {parcel.order.customerPhone}
                  </div>
                </td>
                <td className="mono">{parcel.consignmentId || '—'}</td>
                <td className="mono">{parcel.trackingCode || '—'}</td>
                <td>
                  <span className="badge">{parcel.status.replace(/_/g, ' ').toLowerCase()}</span>
                  {parcel.syncError ? <div className="small" style={{ color: 'var(--berry-600)' }}>{parcel.syncError}</div> : null}
                </td>
                <td>
                  {parcel.riderName ? (
                    <>
                      {parcel.riderName}
                      <div className="small muted">{parcel.riderPhone}</div>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="small muted">{parcel.lastSyncedAt ? formatDateTime(parcel.lastSyncedAt) : '—'}</td>
                <td>
                  <Link href={`/admin/orders/${parcel.orderId}`} className="link-underline">
                    Open order
                  </Link>
                </td>
              </tr>
            ))}
            {!parcels.length ? (
              <tr>
                <td colSpan={7} className="center muted">
                  No parcels created yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="small muted">
        Steadfast does not expose a public “assign rider” endpoint — rider details are captured from the status webhook
        and status polling, then mirrored onto the order lifecycle. Total COD value in transit:{' '}
        {formatMoney(parcels.filter((parcel) => parcel.status !== 'DELIVERED').reduce((sum, parcel) => sum + (parcel.order.grandTotal ?? 0), 0))}
      </p>
    </>
  )
}
