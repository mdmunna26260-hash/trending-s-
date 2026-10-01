import { cookies } from 'next/headers'
import { z } from 'zod'
import { ADMIN_COOKIE, loginAdmin } from '@/lib/auth'
import { handleError, rateLimitSafe } from '@/lib/api-helpers'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
})

export async function POST(request: Request) {
  try {
    const limited = await rateLimitSafe(`admin-login:${request.headers.get('x-forwarded-for') || 'local'}`, 8, 'minute')
    if (!limited.allowed) {
      return Response.json({ success: false, error: 'Too many attempts. Please wait a minute.' }, { status: 429 })
    }

    const body = schema.parse(await request.json())
    const { token, expiresAt, admin } = await loginAdmin(body.email, body.password)

    cookies().set(ADMIN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: expiresAt,
    })

    return Response.json({ success: true, data: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } })
  } catch (error) {
    return handleError(error)
  }
}
