import { requireAdmin } from '@/lib/auth'
import { getBalance, steadfastConfigured } from '@/lib/couriers/steadfast'
import { handleError } from '@/lib/api-helpers'

/** Connectivity check against the Steadfast balance endpoint. */
export async function POST() {
  try {
    await requireAdmin('courier.manage')
    if (!steadfastConfigured) {
      return Response.json({ success: false, error: 'Steadfast credentials are not configured' }, { status: 503 })
    }
    const balance = await getBalance()
    return Response.json({ success: true, data: balance })
  } catch (error) {
    return handleError(error)
  }
}
