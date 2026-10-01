import { z } from 'zod'
import { prisma } from '@/lib/db'
import { assertStrongPassword, requireAdmin } from '@/lib/auth'
import { handleError } from '@/lib/api-helpers'

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(120),
  password: z.string().min(8).max(200),
  role: z.enum(['OWNER', 'MANAGER', 'STAFF']).default('STAFF'),
})

/** Creates an additional admin user (owner only). */
export async function POST(request: Request) {
  try {
    const actor = await requireAdmin()
    if (actor.role !== 'OWNER') {
      return Response.json({ success: false, error: 'Only the owner can create admin users' }, { status: 403 })
    }

    const body = schema.parse(await request.json())
    assertStrongPassword(body.password)

    if (await prisma.admin.findUnique({ where: { email: body.email.toLowerCase() } })) {
      return Response.json({ success: false, error: 'That email already has an account' }, { status: 409 })
    }

    const { hashPassword } = await import('@/lib/crypto')
    const admin = await prisma.admin.create({
      data: {
        email: body.email.toLowerCase(),
        name: body.name,
        role: body.role,
        passwordHash: await hashPassword(body.password),
      },
    })

    await prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: actor.id,
        action: 'admin.created',
        entity: 'Admin',
        entityId: admin.id,
        summary: `${admin.email} (${admin.role})`,
      },
    })

    return Response.json({ success: true, data: { id: admin.id, email: admin.email, role: admin.role } })
  } catch (error) {
    return handleError(error)
  }
}
