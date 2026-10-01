import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleError } from '@/lib/api-helpers'

const schema = z.object({
  type: z.enum(['PHONE', 'EMAIL', 'IP', 'CUSTOMER', 'DEVICE', 'ADDRESS']),
  value: z.string().min(2).max(300),
  reason: z.string().max(300).optional().nullable(),
  severity: z.enum(['WARN', 'REVIEW', 'BLOCK']).default('BLOCK'),
  expiresAt: z.string().optional().nullable(),
})

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin('fraud.manage')
    const body = schema.parse(await request.json())

    const entry = await prisma.blacklist.upsert({
      where: { type_value: { type: body.type, value: body.value.trim() } },
      update: { isActive: true, reason: body.reason || null, severity: body.severity, expiresAt: body.expiresAt ? new Date(body.expiresAt) : null },
      create: {
        type: body.type,
        value: body.value.trim(),
        reason: body.reason || null,
        severity: body.severity,
        createdById: admin.id,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: admin.id,
        action: 'blacklist.updated',
        entity: 'Blacklist',
        entityId: entry.id,
        summary: `${body.type}:${body.value} (${body.severity})`,
      },
    })

    return Response.json({ success: true, data: entry })
  } catch (error) {
    return handleError(error)
  }
}
