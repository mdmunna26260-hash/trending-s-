import { z } from 'zod'
import { trackEvent } from '@/lib/tracking'
import { handleError, rateLimitSafe } from '@/lib/api-helpers'

const schema = z.object({
  eventName: z.string().min(1).max(60),
  eventId: z.string().min(6).max(120),
  source: z.enum(['BROWSER', 'SERVER']).default('BROWSER'),
  orderId: z.string().optional(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  value: z.number().optional(),
  currency: z.string().optional(),
  contentIds: z.array(z.string()).optional(),
  contentType: z.string().optional(),
  numItems: z.number().optional(),
  url: z.string().optional().nullable(),
})

/**
 * Receives browser tracking events (with their event_id) and forwards them to
 * Meta Conversions API / GA4 server-side, deduplicating on the event id.
 */
export async function POST(request: Request) {
  try {
    const limited = await rateLimitSafe(`track:${request.headers.get('x-forwarded-for') || 'local'}`, 120, 'minute')
    if (!limited.allowed) return Response.json({ success: true, data: { deduped: true } })

    const body = schema.parse(await request.json())
    const result = await trackEvent({
      ...body,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    })
    return Response.json({ success: true, data: result })
  } catch (error) {
    return handleError(error)
  }
}
