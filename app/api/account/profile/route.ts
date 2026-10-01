import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSessionCustomer } from '@/lib/session'
import { handleError } from '@/lib/api-helpers'

const schema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(8).max(200).optional(),
  currentPassword: z.string().min(1).max(200).optional(),
})

export async function PATCH(request: Request) {
  try {
    const customer = await getSessionCustomer()
    if (!customer) return Response.json({ success: false, error: 'Please log in' }, { status: 401 })

    const body = schema.parse(await request.json())
    const data: Record<string, unknown> = {}

    if (body.name !== undefined) data.name = body.name
    if (body.email !== undefined) data.email = body.email || null

    if (body.password) {
      if (!customer.passwordHash) {
        return Response.json({ success: false, error: 'No password set on this account' }, { status: 400 })
      }
      if (!body.currentPassword) {
        return Response.json({ success: false, error: 'Current password is required to change it' }, { status: 400 })
      }
      const { verifyPassword, hashPassword } = await import('@/lib/crypto')
      const valid = await verifyPassword(body.currentPassword, customer.passwordHash)
      if (!valid) return Response.json({ success: false, error: 'Current password is incorrect' }, { status: 403 })
      const { assertStrongPassword } = await import('@/lib/auth')
      assertStrongPassword(body.password)
      data.passwordHash = await hashPassword(body.password)
      // Password change invalidates all other sessions.
      await prisma.customerSession.deleteMany({ where: { customerId: customer.id } })
    }

    const updated = await prisma.customer.update({ where: { id: customer.id }, data })

    return Response.json({
      success: true,
      data: { id: updated.id, name: updated.name, phone: updated.phone, email: updated.email },
    })
  } catch (error) {
    return handleError(error)
  }
}
