import type { OrderStatus, PaymentMethod } from '@prisma/client'

/**
 * Order lifecycle definitions. Kept free of server-only imports so both the
 * server (API routes, emails) and client components (admin order actions,
 * tracking UI) can share the exact same rules.
 */

export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED', 'RETURNED'],
  PROCESSING: ['PARCEL_CREATED', 'CANCELLED'],
  PARCEL_CREATED: ['RIDER_ASSIGNED', 'DELIVERED', 'CANCELLED', 'RETURNED'],
  RIDER_ASSIGNED: ['DELIVERED', 'CANCELLED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  PARCEL_CREATED: 'Parcel created',
  RIDER_ASSIGNED: 'Rider assigned',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
}

export const ORDER_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]

export const PAYMENT_METHODS: PaymentMethod[] = ['COD', 'BKASH', 'NAGAD', 'ROCKET', 'CARD']

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  COD: 'Cash on delivery',
  BKASH: 'bKash',
  NAGAD: 'Nagad',
  ROCKET: 'Rocket',
  CARD: 'Card',
}

/** Ordered timeline used by the customer tracking page. */
export const TRACKING_STEPS: Array<{ key: OrderStatus; label: string; hint: string }> = [
  { key: 'PENDING', label: 'Order placed', hint: 'We have received your order' },
  { key: 'CONFIRMED', label: 'Confirmed', hint: 'Verified by our team' },
  { key: 'PROCESSING', label: 'Processing', hint: 'Packed and labelled' },
  { key: 'PARCEL_CREATED', label: 'Parcel created', hint: 'Handed to the courier' },
  { key: 'RIDER_ASSIGNED', label: 'Rider assigned', hint: 'Out for delivery' },
  { key: 'DELIVERED', label: 'Delivered', hint: 'Enjoy your piece' },
]

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_FLOW[from].includes(to)
}
