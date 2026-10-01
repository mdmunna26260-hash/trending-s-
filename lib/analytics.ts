'use client'

/**
 * Browser-side analytics helper.
 *
 * Fires the Meta Pixel / GA4 event in the browser and then posts the SAME
 * event_id to our own endpoint so the server can forward it through the Meta
 * Conversions API without double counting (event deduplication).
 */

declare global {
  interface Window {
    fbq?: (...args: any[]) => void
    gtag?: (...args: any[]) => void
    dataLayer?: any[]
  }
}

export function trackEvent(
  eventName: string,
  params: {
    value?: number
    currency?: string
    contentIds?: string[]
    contentType?: string
    numItems?: number
    eventId?: string
  } = {},
) {
  if (typeof window === 'undefined') return
  const eventId = params.eventId || `${eventName.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  try {
    window.fbq?.('track', eventName, params, { eventID: eventId })
  } catch {
    /* pixel not loaded */
  }

  try {
    window.gtag?.('event', eventName, {
      currency: params.currency || 'BDT',
      value: params.value,
      items: params.contentIds?.map((id) => ({ item_id: id })),
    })
  } catch {
    /* gtag not loaded */
  }

  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventName,
      eventId,
      source: 'BROWSER',
      value: params.value,
      currency: params.currency,
      contentIds: params.contentIds,
      contentType: params.contentType,
      numItems: params.numItems,
      url: window.location.href,
    }),
    keepalive: true,
  }).catch(() => {})
}
