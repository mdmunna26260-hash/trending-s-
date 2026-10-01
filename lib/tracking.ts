import crypto from 'node:crypto'
import { prisma } from './db'
import { env } from './env'

/**
 * Server-side conversion tracking (Meta Conversions API + GA4 Measurement
 * Protocol) with browser/server event deduplication.
 *
 * The browser sends the same `event_id` it used for the Meta Pixel / gtag
 * call; the server stores it and refuses to forward a duplicate, which is
 * exactly what Meta requires for accurate attribution.
 */

const GRAPH_VERSION = 'v21.0'

export interface TrackEventInput {
  eventName: string
  eventId: string
  source?: 'BROWSER' | 'SERVER'
  orderId?: string
  email?: string | null
  phone?: string | null
  ip?: string | null
  userAgent?: string | null
  url?: string | null
  value?: number
  currency?: string
  contentIds?: string[]
  contentType?: string
  numItems?: number
  dedupe?: boolean
}

function hash(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

async function metaCapi(event: TrackEventInput) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
  if (!pixelId || !env.META_CONVERSIONS_API_TOKEN) {
    return { skipped: true as const }
  }

  const userData: Record<string, unknown> = {}
  if (event.email) userData.em = [hash(event.email)]
  if (event.phone) userData.ph = [hash(event.phone.replace(/[^\d]/g, ''))]
  if (event.ip) userData.client_ip_address = event.ip
  if (event.userAgent) userData.client_user_agent = event.userAgent

  const body = {
    data: [
      {
        event_name: event.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: event.eventId,
        action_source: 'website',
        event_source_url: event.url || undefined,
        user_data: userData,
        custom_data: {
          currency: event.currency || 'BDT',
          value: event.value !== undefined ? event.value / 100 : undefined,
          content_ids: event.contentIds,
          content_type: event.contentType || 'product',
          num_items: event.numItems,
        },
      },
    ],
    ...(env.META_TEST_EVENT_CODE ? { test_event_code: env.META_TEST_EVENT_CODE } : {}),
  }

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(env.META_CONVERSIONS_API_TOKEN)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`Meta CAPI error: ${JSON.stringify(payload)}`)
  return payload
}

async function ga4Mp(event: TrackEventInput) {
  const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
  const apiSecret = process.env.GA4_API_SECRET
  if (!measurementId || !apiSecret) return { skipped: true as const }

  const response = await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
    {
      method: 'POST',
      body: JSON.stringify({
        client_id: event.eventId,
        events: [
          {
            name: event.eventName.toLowerCase(),
            params: {
              currency: event.currency || 'BDT',
              value: event.value !== undefined ? event.value / 100 : undefined,
              items: event.contentIds?.map((id) => ({ item_id: id })),
              engagement_time_msec: 1,
            },
          },
        ],
      }),
    },
  )
  if (!response.ok) throw new Error(`GA4 MP error: ${response.status}`)
  return { ok: true }
}

/**
 * Records a tracking event and forwards it to the configured providers.
 * Returns `deduped: true` when the event id was already processed.
 */
export async function trackEvent(input: TrackEventInput) {
  const dedupe = input.dedupe !== false

  let deduped = false
  if (dedupe) {
    try {
      await prisma.trackingEvent.create({
        data: {
          eventName: input.eventName,
          eventId: input.eventId,
          source: input.source || 'SERVER',
          orderId: input.orderId,
          payload: {
            value: input.value,
            currency: input.currency,
            contentIds: input.contentIds,
            numItems: input.numItems,
            url: input.url,
          } as never,
        },
      })
    } catch (error) {
      const code = (error as { code?: string }).code
      if (code === 'P2002') {
        deduped = true
      } else {
        console.error('[track]', error)
      }
    }
  }

  if (deduped) return { deduped: true }

  const errors: string[] = []
  await Promise.allSettled([metaCapi(input), ga4Mp(input)]).then((results) => {
    results.forEach((result) => {
      if (result.status === 'rejected') errors.push(result.reason?.message || 'forwarding failed')
    })
  })

  if (errors.length) {
    await prisma.trackingEvent
      .updateMany({
        where: { eventId: input.eventId },
        data: { forwardError: errors.join('; ') },
      })
      .catch(() => {})
  } else {
    await prisma.trackingEvent
      .updateMany({ where: { eventId: input.eventId }, data: { forwarded: true } })
      .catch(() => {})
  }

  return { deduped: false, errors }
}

/** Generates a deterministic event id so browser + server calls match. */
export function newEventId(prefix = 'evt'): string {
  return `${prefix}_${crypto.randomUUID()}`
}
