import { cookies } from 'next/headers'
import { z } from 'zod'
import { CUSTOMER_COOKIE, loginCustomer, registerCustomer } from '@/lib/auth'
import { sendMail } from '@/lib/mailer'
import { welcomeEmail } from '@/lib/emails'
import { getSettings } from '@/lib/settings'
import { env } from '@/lib/env'
import { handleError, rateLimitSafe } from '@/lib/api-helpers'

const schema = z.object({
  phone: z.string().min(11).max(20),
  name: z.string().min(2).max(120),
  password: z.string().min(8).max(200),
  email: z.string().email().optional().or(z.literal('')),
})

export async function POST(request: Request) {
  try {
    const limited = await rateLimitSafe(`register:${request.headers.get('x-forwarded-for') || 'local'}`, 5, 'hour')
    if (!limited.allowed) {
      return Response.json({ success: false, error: 'Too many accounts created from this connection' }, { status: 429 })
    }

    const body = schema.parse(await request.json())
    await registerCustomer({
      phone: body.phone,
      name: body.name,
      password: body.password,
    })

    const { token, expiresAt, customer } = await loginCustomer(body.phone, body.password)
    cookies().set(CUSTOMER_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: expiresAt,
    })

    if (customer.email) {
      const settings = await getSettings()
      const mail = welcomeEmail(customer.name || 'friend', {
        storeName: settings.storeName,
        supportPhone: settings.supportPhone,
        supportEmail: settings.supportEmail,
      }, `${env.SITE_URL}/shop`)
      await sendMail({ to: customer.email, ...mail, template: 'welcome' })
    }

    return Response.json({
      success: true,
      data: { id: customer.id, name: customer.name, phone: customer.phone },
    })
  } catch (error) {
    return handleError(error)
  }
}
