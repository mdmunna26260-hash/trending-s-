import { prisma } from '../db'
import { ApiError } from '../http'
import { hasSteadfast } from '../env'
import { createParcel, getParcelStatus, getParcelStatusByInvoice } from './steadfast'
import { updateOrderStatus, ORDER_STATUS_FLOW } from '../orders'
import type { OrderStatus } from '@prisma/client'

/**
 * Courier service layer: creates parcels with Steadfast, keeps the local
 * Parcel row in sync and reflects delivery status back onto the order
 * lifecycle. Duplicate parcel creation is prevented by the unique
 * Parcel.orderId constraint plus an explicit guard.
 */
export async function createParcelForOrder(
  orderId: string,
  options: { actorType?: string; actorId?: string } = {},
) {
  if (!hasSteadfast) {
    throw new ApiError(503, 'Steadfast API credentials are not configured')
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { parcel: true, items: true },
  })
  if (!order) throw new ApiError(404, 'Order not found')
  if (order.parcel) {
    throw new ApiError(409, `A parcel already exists for this order (consignment ${order.parcel.consignmentId})`)
  }

  const result = await createParcel({
    invoice: order.orderNumber,
    recipientName: order.customerName,
    recipientPhone: order.customerPhone,
    recipientAddress: [order.shippingAddress, order.area, order.city, order.district, order.postcode]
      .filter(Boolean)
      .join(', '),
    codAmount: order.grandTotal,
    note: order.notes || '',
  })

  const parcel = await prisma.parcel.create({
    data: {
      orderId: order.id,
      provider: 'STEADFAST',
      consignmentId: result.consignmentId,
      trackingCode: result.trackingCode,
      status: 'IN_REVIEW',
      rawResponse: result.raw as never,
      lastSyncedAt: new Date(),
    },
  })

  await prisma.auditLog.create({
    data: {
      actorType: options.actorType || 'ADMIN',
      actorId: options.actorId,
      action: 'parcel.created',
      entity: 'Parcel',
      entityId: parcel.id,
      summary: `Consignment ${parcel.consignmentId} for order ${order.orderNumber}`,
    },
  })

  // Only advance the order when the transition is legal.
  if (ORDER_STATUS_FLOW[order.status].includes('PARCEL_CREATED')) {
    await updateOrderStatus(order.id, 'PARCEL_CREATED', {
      actorType: options.actorType || 'ADMIN',
      actorId: options.actorId,
      note: 'Parcel created with Steadfast',
      notify: true,
    })
  }

  return parcel
}

/** Refreshes parcel status from Steadfast and mirrors it on the order. */
export async function syncParcelStatus(parcelId: string, options: { actorId?: string } = {}) {
  const parcel = await prisma.parcel.findUnique({ where: { id: parcelId }, include: { order: true } })
  if (!parcel) throw new ApiError(404, 'Parcel not found')

  const order = parcel.order
  const lookup = parcel.consignmentId
    ? await getParcelStatus(parcel.consignmentId)
    : await getParcelStatusByInvoice(order.orderNumber)

  const deliveryStatus = String(lookup.deliveryStatus || '').toLowerCase()
  const riderName = lookup.raw?.rider_name ?? lookup.raw?.data?.rider_name ?? null
  const riderPhone = lookup.raw?.rider_phone ?? lookup.raw?.data?.rider_phone ?? null

  let parcelStatus = parcel.status
  if (deliveryStatus.includes('delivered')) parcelStatus = 'DELIVERED'
  else if (deliveryStatus.includes('partial')) parcelStatus = 'PARTIAL_DELIVERED'
  else if (deliveryStatus.includes('cancelled')) parcelStatus = 'CANCELLED'
  else if (deliveryStatus.includes('returned') || deliveryStatus.includes('return')) parcelStatus = 'RETURNED'
  else if (deliveryStatus.includes('rider')) parcelStatus = 'APPROVED'
  else if (deliveryStatus) parcelStatus = 'IN_REVIEW'

  await prisma.parcel.update({
    where: { id: parcel.id },
    data: {
      status: parcelStatus,
      riderName,
      riderPhone,
      rawResponse: lookup.raw as never,
      lastSyncedAt: new Date(),
      syncError: null,
    },
  })

  const mapping: Record<string, OrderStatus> = {
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
    RETURNED: 'RETURNED',
  }
  const target = mapping[parcelStatus]
  if (target && order.status !== target && ORDER_STATUS_FLOW[order.status].includes(target)) {
    await updateOrderStatus(order.id, target, { actorType: 'SYSTEM', note: 'Courier status sync' })
  } else if (parcelStatus === 'APPROVED' && riderName && order.status !== 'RIDER_ASSIGNED') {
    if (ORDER_STATUS_FLOW[order.status].includes('RIDER_ASSIGNED')) {
      await updateOrderStatus(order.id, 'RIDER_ASSIGNED', {
        actorType: 'SYSTEM',
        note: `Rider assigned: ${riderName}`,
      })
    }
  }

  return prisma.parcel.findUniqueOrThrow({ where: { id: parcel.id }, include: { order: true } })
}
