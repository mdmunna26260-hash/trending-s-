import type { OrderStatus, Prisma, PaymentMethod } from '@prisma/client'
import { prisma } from './db'
import { ApiError, isValidBdPhone, normalizePhone } from './http'
import { getSettings } from './settings'
import { getCartView } from './cart'
import { assessOrderFraud } from './fraud'
import { newEventId, trackEvent } from './tracking'
import { sendMail } from './mailer'
import {
  abandonedCartEmail,
  cancelledEmail,
  deliveredEmail,
  invoiceEmail,
  orderConfirmationEmail,
  parcelCreatedEmail,
  riderAssignedEmail,
  reviewRequestEmail,
  type OrderEmailData,
} from './emails'
import { env } from './env'
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, PAYMENT_METHODS } from './order-status'

export { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, PAYMENT_METHODS }

export interface CreateOrderInput {
  name: string
  phone: string
  email?: string
  address: string
  area?: string
  city: string
  district: string
  postcode?: string
  notes?: string
  paymentMethod: PaymentMethod
  shippingAddressId?: string | null
  utm?: Record<string, string>
  landingPage?: string
  eventId?: string
}

export async function generateOrderNumber(prefix = 'RV') {
  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = String(Math.floor(Math.random() * 9000) + 1000)
    const candidate = `${prefix}${stamp}${suffix}`
    const existing = await prisma.order.findUnique({ where: { orderNumber: candidate }, select: { id: true } })
    if (!existing) return candidate
  }
  return `${prefix}${stamp}${Date.now().toString().slice(-6)}`
}

/**
 * Converts the active cart into a real order: validates stock, runs the fraud
 * engine, persists order + items + payment + status history, decrements
 * inventory, records coupon usage and fires emails / tracking events.
 */
export async function createOrder(
  input: CreateOrderInput,
  customerId?: string | null,
  meta?: { ip: string; userAgent: string },
) {
  const phone = normalizePhone(input.phone)
  if (!isValidBdPhone(phone)) throw new ApiError(400, 'Enter a valid Bangladeshi phone number')
  if (!input.name?.trim()) throw new ApiError(400, 'Recipient name is required')
  if (!input.address?.trim()) throw new ApiError(400, 'Delivery address is required')
  if (!input.city?.trim()) throw new ApiError(400, 'City is required')
  if (!input.district?.trim()) throw new ApiError(400, 'District is required')

  const settings = await getSettings()
  const cart = await getCartView(customerId)
  const paidLines = cart.lines.filter((line) => !line.isFreeGift)
  if (!paidLines.length) throw new ApiError(400, 'Your cart is empty')

  const subtotal = cart.totals.subtotal
  if (settings.minOrderValue && subtotal < settings.minOrderValue)
    throw new ApiError(400, `Minimum order value is ৳${settings.minOrderValue / 100}`)

  const requestInfo = meta ?? { ip: '0.0.0.0', userAgent: 'server' }
  const orderNumber = await generateOrderNumber(settings.orderPrefix)

  const fraud = await assessOrderFraud({
    orderNumber,
    customerId,
    phone,
    email: input.email || null,
    ip: requestInfo.ip,
    address: `${input.address} ${input.area ?? ''} ${input.city} ${input.district}`,
    grandTotal: cart.totals.grandTotal,
    itemCount: cart.totals.paidItemCount,
  })

  if (fraud.status === 'BLOCKED') {
    throw new ApiError(403, `This order cannot be placed (${fraud.blockReason || 'fraud protection'}). Please contact support.`)
  }

  const coupon = cart.totals.couponCode
    ? await prisma.coupon.findUnique({ where: { code: cart.totals.couponCode } })
    : null
  if (coupon && coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new ApiError(400, 'This coupon has reached its usage limit')
  }

  // Stock is validated inside the transaction so concurrent checkouts can
  // never oversell.
  const order = await prisma.$transaction(async (tx) => {
    for (const line of cart.lines) {
      if (line.isFreeGift) continue
      if (!line.variantId) {
        throw new ApiError(400, `${line.name} is missing a size — please remove and re-add it to your bag`)
      }
      const variant = await tx.productVariant.findUnique({ where: { id: line.variantId } })
      if (!variant || !variant.isActive || variant.stock < line.quantity) {
        throw new ApiError(409, `${line.name}${line.variantName ? ` (${line.variantName})` : ''} just went out of stock`)
      }
    }

    const created = await tx.order.create({
      data: {
        orderNumber,
        customerId: customerId ?? undefined,
        status: 'PENDING',
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentMethod === 'COD' ? 'UNPAID' : 'UNPAID',
        couponId: coupon?.id,
        couponCode: coupon?.code,
        subtotal,
        discountTotal: cart.totals.discountTotal,
        shippingTotal: cart.totals.shippingTotal,
        codFee: cart.totals.codFee,
        grandTotal: cart.totals.grandTotal,
        customerName: input.name.trim(),
        customerPhone: phone,
        customerEmail: input.email?.trim() || null,
        shippingAddress: input.address.trim(),
        area: input.area?.trim() || null,
        city: input.city.trim(),
        district: input.district.trim(),
        postcode: input.postcode?.trim() || null,
        notes: input.notes?.trim() || null,
        ipAddress: requestInfo.ip,
        userAgent: requestInfo.userAgent,
        riskScore: fraud.score,
        fraudStatus: fraud.status === 'PASSED' ? 'PASSED' : fraud.status === 'REVIEW' ? 'REVIEW' : 'BLOCKED',
        utmSource: input.utm?.utm_source || null,
        utmMedium: input.utm?.utm_medium || null,
        utmCampaign: input.utm?.utm_campaign || null,
        utmContent: input.utm?.utm_content || null,
        utmTerm: input.utm?.utm_term || null,
        landingPage: input.landingPage || null,
        items: {
          create: cart.lines.map((line) => ({
            productId: line.productId,
            variantId: line.variantId,
            variantName: line.variantName,
            sku: line.variantId ? undefined : undefined,
            name: line.name,
            imagePath: line.imagePath,
            unitPrice: line.unitPrice,
            quantity: line.quantity,
            lineTotal: line.isFreeGift ? 0 : line.unitPrice * line.quantity,
            isFreeGift: line.isFreeGift,
          })),
        },
        statusHistory: {
          create: [{ status: 'PENDING', note: 'Order placed by customer', actorType: 'CUSTOMER' }],
        },
        payments: {
          create: [
            {
              method: input.paymentMethod,
              status: 'UNPAID',
              amount: cart.totals.grandTotal,
              meta: { cod: input.paymentMethod === 'COD' } as Prisma.InputJsonValue,
            },
          ],
        },
      },
      include: { items: true },
    })

    for (const line of cart.lines) {
      if (line.isFreeGift) continue
      await tx.productVariant.update({
        where: { id: line.variantId! },
        data: { stock: { decrement: line.quantity } },
      })
    }

    if (coupon) {
      await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } })
      await tx.couponRedemption.create({
        data: {
          couponId: coupon.id,
          orderId: created.id,
          phone,
          amount: cart.totals.discountTotal,
        },
      })
    }

    if (customerId) {
      await tx.customer.update({ where: { id: customerId }, data: { riskScore: fraud.score } }).catch(() => {})
    }

    await tx.cartItem.deleteMany({ where: { cart: { token: cart.token } } })
    await tx.cart.update({ where: { token: cart.token }, data: { couponCode: null } })

    return created
  })

  const eventId = input.eventId || newEventId('purchase')
  await trackEvent({
    eventName: 'Purchase',
    eventId,
    source: 'SERVER',
    orderId: order.id,
    email: order.customerEmail,
    phone: order.customerPhone,
    ip: order.ipAddress,
    userAgent: order.userAgent,
    url: `${env.SITE_URL}/order/${order.orderNumber}`,
    value: order.grandTotal,
    currency: 'BDT',
    contentIds: order.items.filter((item) => !item.isFreeGift).map((item) => item.productId || item.name),
    contentType: 'product',
    numItems: order.items.filter((item) => !item.isFreeGift).reduce((sum, item) => sum + item.quantity, 0),
  })

  return { order, fraud }
}

export async function loadOrderForEmail(orderId: string): Promise<OrderEmailData> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true, parcel: true },
  })
  return {
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    items: order.items.map((item) => ({
      name: item.name,
      variantName: item.variantName,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      isFreeGift: item.isFreeGift,
    })),
    subtotal: order.subtotal,
    discountTotal: order.discountTotal,
    shippingTotal: order.shippingTotal,
    grandTotal: order.grandTotal,
    address: order.shippingAddress,
    area: order.area,
    city: order.city,
    district: order.district,
    trackingUrl: `${env.SITE_URL}/order/${order.orderNumber}`,
    trackingCode: order.parcel?.trackingCode ?? null,
    riderName: order.parcel?.riderName ?? null,
    riderPhone: order.parcel?.riderPhone ?? null,
    couponCode: order.couponCode,
    paymentMethod: order.paymentMethod,
  }
}

async function storeEmailSettings() {
  const settings = await getSettings()
  return {
    storeName: settings.storeName,
    supportPhone: settings.supportPhone,
    supportEmail: settings.supportEmail,
  }
}

/**
 * Applies a status transition, writes history, keeps the courier parcel in
 * sync and sends the customer-facing email for that transition.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  options: { actorType?: string; actorId?: string; note?: string; notify?: boolean; silent?: boolean } = {},
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, parcel: true, customer: true },
  })
  if (!order) throw new ApiError(404, 'Order not found')

  if (order.status !== status) {
    const allowed = ORDER_STATUS_FLOW[order.status]
    if (!allowed.includes(status)) {
      throw new ApiError(409, `Cannot move order from ${order.status} to ${status}`)
    }
  }

  const now = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        status,
        confirmedAt: status === 'CONFIRMED' ? now : order.confirmedAt,
        deliveredAt: status === 'DELIVERED' ? now : order.deliveredAt,
        cancelledAt: status === 'CANCELLED' ? now : order.cancelledAt,
        cancelReason: options.note && status === 'CANCELLED' ? options.note : order.cancelReason,
        returnReason: options.note && status === 'RETURNED' ? options.note : order.returnReason,
        paymentStatus: status === 'DELIVERED' && order.paymentMethod === 'COD' ? 'PAID' : order.paymentStatus,
      },
    })
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status,
        note: options.note,
        actorType: options.actorType || 'ADMIN',
        actorId: options.actorId,
      },
    })

    // Restock when an order is cancelled or returned.
    if (status === 'CANCELLED' || status === 'RETURNED') {
      for (const item of order.items) {
        if (item.isFreeGift || !item.variantId) continue
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        })
      }
      if (order.couponId) {
        await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { decrement: 1 } } })
      }
    }
  })

  const settings = await storeEmailSettings()
  const data = await loadOrderForEmail(orderId)
  const trackingUrl = `${env.SITE_URL}/order/${order.orderNumber}`

  const emailJobs: Array<Promise<unknown>> = []
  if (options.notify !== false && order.customerEmail) {
    switch (status) {
      case 'PENDING': {
        const mail = orderConfirmationEmail(data, settings)
        const invoice = invoiceEmail(data, settings)
        emailJobs.push(sendMail({ to: order.customerEmail, ...mail, template: 'order_confirmation', orderId }))
        emailJobs.push(sendMail({ to: order.customerEmail, ...invoice, template: 'invoice', orderId }))
        break
      }
      case 'PARCEL_CREATED': {
        const mail = parcelCreatedEmail(data, settings)
        emailJobs.push(sendMail({ to: order.customerEmail, ...mail, template: 'parcel_created', orderId }))
        break
      }
      case 'RIDER_ASSIGNED': {
        const mail = riderAssignedEmail(data, settings)
        emailJobs.push(sendMail({ to: order.customerEmail, ...mail, template: 'rider_assigned', orderId }))
        break
      }
      case 'DELIVERED': {
        const mail = deliveredEmail(data, settings)
        emailJobs.push(sendMail({ to: order.customerEmail, ...mail, template: 'delivered', orderId }))
        const review = reviewRequestEmail(data, settings, `${env.SITE_URL}/order/${order.orderNumber}#review`)
        emailJobs.push(
          new Promise((resolve) =>
            setTimeout(
              () => resolve(sendMail({ to: order.customerEmail!, ...review, template: 'review_request', orderId })),
              60_000,
            ),
          ),
        )
        break
      }
      case 'CANCELLED': {
        const mail = cancelledEmail({ ...data, reason: options.note }, settings)
        emailJobs.push(sendMail({ to: order.customerEmail, ...mail, template: 'cancelled', orderId }))
        break
      }
      default:
        break
    }
  }

  if (!options.silent) {
    await Promise.allSettled(emailJobs)
  }

  // Create the Steadfast parcel automatically once an order is confirmed.
  const freshSettings = await getSettings()
  if (status === 'CONFIRMED' && freshSettings.autoParcelOnConfirm && !order.parcel) {
    const { createParcelForOrder } = await import('./couriers/parcel-service')
    await createParcelForOrder(orderId, { actorType: options.actorType || 'ADMIN', actorId: options.actorId }).catch(
      (error) => console.error('[steadfast] auto parcel failed:', error.message),
    )
  }

  return { status, trackingUrl }
}

export async function sendAbandonedCartEmail(cartId: string) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: { items: { include: { product: { include: { images: true } } } }, customer: true },
  })
  if (!cart || !cart.items.length) return { sent: false, reason: 'empty_cart' as const }
  if (!cart.customer?.email) return { sent: false, reason: 'no_email' as const }

  const settings = await storeEmailSettings()
  const items = cart.items.map((item) => ({
    name: item.product.name,
    quantity: item.quantity,
    lineTotal: item.isFreeGift ? 0 : item.unitPrice * item.quantity,
    imagePath: item.product.images[0]?.path ?? null,
  }))
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const mail = abandonedCartEmail(items, total, `${env.SITE_URL}/cart`, settings, cart.couponCode ?? undefined)
  const result = await sendMail({
    to: cart.customer.email,
    ...mail,
    template: 'abandoned_cart',
  })
  await prisma.cart.update({
    where: { id: cartId },
    data: { recoveryEmailSentAt: new Date(), recoveryCount: { increment: 1 } },
  })
  return result
}
