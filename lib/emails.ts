import { escapeHtml } from './http'

export interface OrderEmailData {
  orderNumber: string
  customerName: string
  customerPhone: string
  items: Array<{ name: string; variantName?: string | null; quantity: number; lineTotal: number; isFreeGift: boolean }>
  subtotal: number
  discountTotal: number
  shippingTotal: number
  grandTotal: number
  address: string
  area?: string | null
  city: string
  district: string
  trackingUrl?: string
  trackingCode?: string | null
  riderName?: string | null
  riderPhone?: string | null
  reason?: string | null
  couponCode?: string | null
  paymentMethod?: string
}

const money = (poisha: number) =>
  `৳${(poisha / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

const layout = (title: string, body: string, settings: { storeName: string; supportPhone: string; supportEmail: string }) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f2efe9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#17150f;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2efe9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid #e3ddd1;">
        <tr><td style="padding:28px 32px;border-bottom:1px solid #e3ddd1;">
          <div style="font-size:20px;letter-spacing:.32em;text-transform:uppercase;font-weight:600;">${escapeHtml(settings.storeName)}</div>
          <div style="font-size:12px;color:#6f6a5e;margin-top:6px;letter-spacing:.08em;text-transform:uppercase;">${escapeHtml(title)}</div>
        </td></tr>
        <tr><td style="padding:32px;">${body}</td></tr>
        <tr><td style="padding:24px 32px;border-top:1px solid #e3ddd1;background:#faf8f4;">
          <p style="margin:0 0 6px;font-size:12px;color:#6f6a5e;">Questions? Call ${escapeHtml(settings.supportPhone)} or reply to ${escapeHtml(settings.supportEmail)}.</p>
          <p style="margin:0;font-size:11px;color:#97918a;">${escapeHtml(settings.storeName)} · Dhaka, Bangladesh</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

const itemRows = (order: OrderEmailData) =>
  order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #efe9de;font-size:14px;">
          ${escapeHtml(item.name)}${item.variantName ? ` <span style="color:#6f6a5e;">— ${escapeHtml(item.variantName)}</span>` : ''}
          ${item.isFreeGift ? '<span style="color:#8a6a2f;font-size:11px;letter-spacing:.1em;text-transform:uppercase;"> · Free gift</span>' : ''}
          <div style="font-size:12px;color:#6f6a5e;margin-top:2px;">Qty ${item.quantity}</div>
        </td>
        <td align="right" style="padding:12px 0;border-bottom:1px solid #efe9de;font-size:14px;white-space:nowrap;">${item.isFreeGift ? 'Free' : money(item.lineTotal)}</td>
      </tr>`,
    )
    .join('')

const totals = (order: OrderEmailData) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
    <tr><td style="font-size:13px;color:#6f6a5e;padding:4px 0;">Subtotal</td><td align="right" style="font-size:13px;padding:4px 0;">${money(order.subtotal)}</td></tr>
    ${order.discountTotal ? `<tr><td style="font-size:13px;color:#6f6a5e;padding:4px 0;">Discount${order.couponCode ? ` (${escapeHtml(order.couponCode)})` : ''}</td><td align="right" style="font-size:13px;padding:4px 0;color:#8a6a2f;">−${money(order.discountTotal)}</td></tr>` : ''}
    <tr><td style="font-size:13px;color:#6f6a5e;padding:4px 0;">Delivery</td><td align="right" style="font-size:13px;padding:4px 0;">${order.shippingTotal ? money(order.shippingTotal) : 'Free'}</td></tr>
    <tr><td style="font-size:15px;font-weight:600;padding:10px 0 0;border-top:1px solid #e3ddd1;">Total ${order.paymentMethod === 'COD' ? '(Cash on delivery)' : ''}</td><td align="right" style="font-size:15px;font-weight:600;padding:10px 0 0;border-top:1px solid #e3ddd1;">${money(order.grandTotal)}</td></tr>
  </table>`

const addressBlock = (order: OrderEmailData) => `
  <div style="margin-top:24px;padding:16px;background:#faf8f4;border:1px solid #efe9de;">
    <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#6f6a5e;margin-bottom:8px;">Delivery address</div>
    <div style="font-size:14px;line-height:1.6;">${escapeHtml(order.customerName)}<br />${escapeHtml(order.address)}<br />${escapeHtml(order.area ? `${order.area}, ` : '')}${escapeHtml(order.city)}, ${escapeHtml(order.district)}<br />${escapeHtml(order.customerPhone)}</div>
  </div>`

const button = (href: string, label: string) => `
  <a href="${escapeHtml(href)}" style="display:inline-block;margin-top:24px;padding:14px 28px;background:#17150f;color:#ffffff;text-decoration:none;font-size:12px;letter-spacing:.18em;text-transform:uppercase;">${escapeHtml(label)}</a>`

export function orderConfirmationEmail(order: OrderEmailData, settings: StoreEmailSettings) {
  const body = `
    <h1 style="margin:0 0 12px;font-size:24px;font-weight:500;">Thank you, ${escapeHtml(order.customerName.split(' ')[0] || 'there')}.</h1>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#4b463d;">Your order <strong>${escapeHtml(order.orderNumber)}</strong> has been received. We will confirm it by phone shortly and dispatch it with our courier partner.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows(order)}</table>
    ${totals(order)}
    ${addressBlock(order)}
    ${order.trackingUrl ? button(order.trackingUrl, 'Track your order') : ''}`
  return { subject: `Order ${order.orderNumber} confirmed`, html: layout('Order confirmation', body, settings) }
}

export function invoiceEmail(order: OrderEmailData, settings: StoreEmailSettings) {
  const body = `
    <h1 style="margin:0 0 12px;font-size:24px;font-weight:500;">Invoice ${escapeHtml(order.orderNumber)}</h1>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#4b463d;">Here is the invoice for your order. Please keep it for your records.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows(order)}</table>
    ${totals(order)}
    ${addressBlock(order)}`
  return { subject: `Invoice for order ${order.orderNumber}`, html: layout('Invoice', body, settings) }
}

export function parcelCreatedEmail(order: OrderEmailData, settings: StoreEmailSettings) {
  const body = `
    <h1 style="margin:0 0 12px;font-size:24px;font-weight:500;">Your parcel is on the way</h1>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#4b463d;">Order <strong>${escapeHtml(order.orderNumber)}</strong> has been handed to our courier partner${order.trackingCode ? ` with tracking code <strong>${escapeHtml(order.trackingCode)}</strong>` : ''}.</p>
    ${order.trackingUrl ? button(order.trackingUrl, 'Track shipment') : ''}
    ${addressBlock(order)}`
  return { subject: `Order ${order.orderNumber} shipped`, html: layout('Shipment update', body, settings) }
}

export function riderAssignedEmail(order: OrderEmailData, settings: StoreEmailSettings) {
  const body = `
    <h1 style="margin:0 0 12px;font-size:24px;font-weight:500;">A rider is on the way</h1>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#4b463d;">Order <strong>${escapeHtml(order.orderNumber)}</strong> has been assigned to ${escapeHtml(order.riderName || 'our delivery rider')}${order.riderPhone ? ` (${escapeHtml(order.riderPhone)})` : ''}. Please keep your phone reachable.</p>
    ${order.trackingUrl ? button(order.trackingUrl, 'Track shipment') : ''}`
  return { subject: `Order ${order.orderNumber} out for delivery`, html: layout('Rider assigned', body, settings) }
}

export function deliveredEmail(order: OrderEmailData, settings: StoreEmailSettings, reviewUrl?: string) {
  const body = `
    <h1 style="margin:0 0 12px;font-size:24px;font-weight:500;">Delivered</h1>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#4b463d;">Order <strong>${escapeHtml(order.orderNumber)}</strong> has been delivered. We hope you love it.</p>
    ${reviewUrl ? button(reviewUrl, 'Write a review') : ''}
    ${addressBlock(order)}`
  return { subject: `Order ${order.orderNumber} delivered`, html: layout('Delivered', body, settings) }
}

export function cancelledEmail(order: OrderEmailData, settings: StoreEmailSettings) {
  const body = `
    <h1 style="margin:0 0 12px;font-size:24px;font-weight:500;">Order cancelled</h1>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#4b463d;">Order <strong>${escapeHtml(order.orderNumber)}</strong> has been cancelled${order.reason ? `: ${escapeHtml(order.reason)}` : ''}. If you did not expect this, please call ${escapeHtml(settings.supportPhone)}.</p>`
  return { subject: `Order ${order.orderNumber} cancelled`, html: layout('Order cancelled', body, settings) }
}

export function reviewRequestEmail(order: OrderEmailData, settings: StoreEmailSettings, reviewUrl: string) {
  const body = `
    <h1 style="margin:0 0 12px;font-size:24px;font-weight:500;">How was it?</h1>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#4b463d;">Tell us what you thought of order <strong>${escapeHtml(order.orderNumber)}</strong>. Your feedback helps other shoppers.</p>
    ${button(reviewUrl, 'Write a review')}`
  return { subject: `Review your order ${order.orderNumber}`, html: layout('Review request', body, settings) }
}

export function abandonedCartEmail(
  items: Array<{ name: string; quantity: number; lineTotal: number; imagePath?: string | null }>,
  total: number,
  resumeUrl: string,
  settings: StoreEmailSettings,
  couponCode?: string,
) {
  const body = `
    <h1 style="margin:0 0 12px;font-size:24px;font-weight:500;">You left something behind</h1>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#4b463d;">Your cart is still waiting${couponCode ? ` — use code <strong>${escapeHtml(couponCode)}</strong> for a little something extra` : ''}.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${items
        .map(
          (item) => `<tr>
            <td style="padding:12px 0;border-bottom:1px solid #efe9de;font-size:14px;">${escapeHtml(item.name)}<div style="font-size:12px;color:#6f6a5e;">Qty ${item.quantity}</div></td>
            <td align="right" style="padding:12px 0;border-bottom:1px solid #efe9de;font-size:14px;white-space:nowrap;">${money(item.lineTotal)}</td>
          </tr>`,
        )
        .join('')}
      <tr><td style="font-size:15px;font-weight:600;padding:12px 0;">Cart total</td><td align="right" style="font-size:15px;font-weight:600;padding:12px 0;">${money(total)}</td></tr>
    </table>
    ${button(resumeUrl, 'Resume checkout')}`
  return { subject: 'Your cart is waiting', html: layout('Complete your order', body, settings) }
}

export function welcomeEmail(name: string, settings: StoreEmailSettings, shopUrl: string) {
  const body = `
    <h1 style="margin:0 0 12px;font-size:24px;font-weight:500;">Welcome, ${escapeHtml(name.split(' ')[0] || 'friend')}.</h1>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#4b463d;">Your account is ready. Track orders, save favourites and check out faster.</p>
    ${button(shopUrl, 'Start shopping')}`
  return { subject: `Welcome to ${settings.storeName}`, html: layout('Welcome', body, settings) }
}

interface StoreEmailSettings {
  storeName: string
  supportPhone: string
  supportEmail: string
}
