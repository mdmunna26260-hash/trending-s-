import { prisma } from '@/lib/db'
import { verifyWebhookSignature } from '@/lib/couriers/steadfast'
import { updateOrderStatus } from '@/lib/orders'
import { handleError } from '@/lib/api-helpers'

/**
 * Steadfast delivery-status webhook. Verifies the HMAC signature (when
 * configured), stores the raw payload and mirrors the courier status onto the
 * order lifecycle.
 */
export async function POST(request: Request) {
  try {
    const raw = await request.text()
    const signature = request.headers.get('x-signature') || request.headers.get('steadfast-signature')

    if (process.env.STEADFAST_SECRET_KEY && signature && !verifyWebhookSignature(raw, signature)) {
      return Response.json({ success: false, error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(raw)
    const consignmentId = String(payload.consignment_id ?? payload.consignmentId ?? '')
    const deliveryStatus = String(payload.delivery_status ?? payload.status ?? '').toLowerCase()

    if (!consignmentId) {
      return Response.json({ success: false, error: 'consignment_id is required' }, { status: 400 })
    }

    const parcel = await prisma.parcel.findUnique({
      where: { consignmentId },
      include: { order: true },
    })
    if (!parcel) {
      return Response.json({ success: false, error: 'Unknown consignment' }, { status: 404 })
    }

    await prisma.parcel.update({
      where: { id: parcel.id },
      data: {
        status: deliveryStatus.includes('delivered')
          ? 'DELIVERED'
          : deliveryStatus.includes('cancelled')
            ? 'CANCELLED'
            : deliveryStatus.includes('return')
              ? 'RETURNED'
              : 'IN_REVIEW',
        riderName: payload.rider_name ?? parcel.riderName,
        riderPhone: payload.rider_phone ?? parcel.riderPhone,
        rawResponse: payload,
        lastSyncedAt: new Date(),
      },
    })

    const statusMap: Record<string, 'DELIVERED' | 'CANCELLED' | 'RETURNED' | 'RIDER_ASSIGNED'> = {
      delivered: 'DELIVERED',
      delivered_approval_pending: 'DELIVERED',
      partial_delivered: 'DELIVERED',
      cancelled: 'CANCELLED',
      cancelled_approval_pending: 'CANCELLED',
      returned: 'RETURNED',
      returned_approval_pending: 'RETURNED',
      rider_assigned: 'RIDER_ASSIGNED',
      picked: 'RIDER_ASSIGNED',
    }

    const target = statusMap[deliveryStatus]
    if (target && parcel.order.status !== target) {
      await updateOrderStatus(parcel.orderId, target, { actorType: 'WEBHOOK', note: 'Steadfast webhook' })
    }

    return Response.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
