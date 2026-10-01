import { cookies } from 'next/headers'
import { z } from 'zod'
import { CUSTOMER_COOKIE, loginCustomer } from '@/lib/auth'
import { handleError, rateLimitSafe } from '@/lib/api-helpers'

const schema = z.object({
  phone: z.string().min(11).max(20),
  password: z.string().min(1).max(200),
})

export async function POST(request: Request) {
  try {
    const limited = await rateLimitSafe(`login:${request.headers.get('x-forwarded-for') || 'local'}`, 12, 'minute')
    if (!limited.allowed) {
      return Response.json({ success: false, error: 'Too many attempts. Please try again shortly.' }, { status: 429 })
    }

    const body = schema.parse(await request.json())
    const { token, expiresAt, customer } = await loginCustomer(body.phone, body.password)

    cookies().set(CUSTOMER_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: expiresAt,
    })

    return Response.json({
      success: true,
      data: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email },
    })
  } catch (error) {
    return handleError(error)
  }
}
