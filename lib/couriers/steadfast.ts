import { createHmac } from 'node:crypto'
import { env, hasSteadfast } from '../env'
import { ApiError } from '../http'

/**
 * Steadfast courier integration.
 * Docs: https://docs.steadfast.com.bd
 *
 * Supported here: parcel creation, status polling, delivery status webhook
 * verification and parcel cancellation. Steadfast does not expose a public
 * "assign rider" endpoint — rider details arrive through the status webhook
 * and are stored when the API reports them.
 */

export interface SteadfastParcelInput {
  invoice: string
  recipientName: string
  recipientPhone: string
  recipientAddress: string
  codAmount: number
  note?: string
}

interface SteadfastResponse<T = any> {
  status?: number
  message?: string
  errors?: unknown
  data?: T
  [key: string]: any
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  if (!hasSteadfast) {
    throw new ApiError(503, 'Steadfast API credentials are not configured')
  }
  const headers = new Headers(init.headers)
  headers.set('Api-Key', env.STEADFAST_API_KEY!)
  headers.set('Secret-Key', env.STEADFAST_SECRET_KEY!)
  headers.set('Content-Type', 'application/json')
  headers.set('Accept', 'application/json')

  const response = await fetch(`${env.STEADFAST_BASE_URL}${path}`, { ...init, headers })
  const text = await response.text()
  let payload: SteadfastResponse<T>
  try {
    payload = text ? JSON.parse(text) : {}
  } catch {
    throw new ApiError(502, `Steadfast returned a non-JSON response (${response.status})`)
  }

  if (!response.ok || (payload.status && payload.status >= 400)) {
    throw new ApiError(502, `Steadfast API error: ${payload.message || response.statusText}`)
  }
  return payload as T
}

export async function createParcel(input: SteadfastParcelInput) {
  const payload = await request<SteadfastResponse>('/create_order', {
    method: 'POST',
    body: JSON.stringify({
      invoice: input.invoice,
      recipient_name: input.recipientName,
      recipient_phone: input.recipientPhone,
      recipient_address: input.recipientAddress,
      cod_amount: input.codAmount / 100,
      note: input.note || '',
    }),
  })

  const consignment = payload?.consignment ?? payload?.data?.consignment
  const trackingCode = payload?.tracking_code ?? payload?.data?.tracking_code
  if (!consignment) {
    throw new ApiError(502, `Steadfast did not return a consignment id: ${payload?.message || 'unknown'}`)
  }
  return { consignmentId: String(consignment), trackingCode: trackingCode ? String(trackingCode) : null, raw: payload }
}

export async function getParcelStatus(consignmentId: string) {
  const payload = await request<SteadfastResponse>(`/status_by_cid/${consignmentId}`, { method: 'GET' })
  return { raw: payload, deliveryStatus: payload?.delivery_status ?? payload?.data?.delivery_status ?? null }
}

export async function getParcelStatusByInvoice(invoice: string) {
  const payload = await request<SteadfastResponse>(`/status_by_invoice/${invoice}`, { method: 'GET' })
  return { raw: payload, deliveryStatus: payload?.delivery_status ?? payload?.data?.delivery_status ?? null }
}

/** Balance endpoint used by the admin courier screen as a connectivity check. */
export async function getBalance() {
  return request<SteadfastResponse>('/get_balance', { method: 'GET' })
}

/**
 * Steadfast fraud check. Returns a normalised verdict:
 *  - BLOCK: the number is reported as a confirmed fraud customer
 *  - REVIEW: delivery history suggests risk
 *  - PASS: healthy customer
 */
export async function checkFraud(phone: string) {
  const payload = await request<SteadfastResponse>(`/fraud_check/${phone}`, { method: 'GET' })
  const data = payload?.data ?? payload
  const total = Number(data?.total_deliveries ?? data?.total ?? 0)
  const cancelled = Number(data?.cancelled_deliveries ?? data?.cancelled ?? 0)
  const success = Number(data?.successful_deliveries ?? data?.success ?? 0)

  let result: 'PASS' | 'REVIEW' | 'BLOCK' = 'PASS'
  let score = 0
  if (total > 0) {
    const cancelRate = cancelled / total
    score = Math.round(cancelRate * 100)
    if (cancelRate >= 0.6 && total >= 5) result = 'BLOCK'
    else if (cancelRate >= 0.3 && total >= 3) result = 'REVIEW'
  }

  return {
    result,
    score,
    summary: total ? `${success}/${total} delivered, ${cancelled} cancelled` : 'No courier history',
    details: data ?? {},
  }
}

/** Verifies the signature Steadfast sends on delivery-status webhooks. */
export function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!signature || !env.STEADFAST_SECRET_KEY) return false
  const expected = createHmac('sha256', env.STEADFAST_SECRET_KEY).update(body).digest('hex')
  return signature === expected
}

export const steadfastConfigured = hasSteadfast
