import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleError } from '@/lib/api-helpers'

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin('fraud.manage')
    await prisma.blacklist.update({ where: { id: params.id }, data: { isActive: false } })
    await prisma.auditLog.create({
      data: { actorType: 'ADMIN', actorId: admin.id, action: 'blacklist.removed', entity: 'Blacklist', entityId: params.id },
    })
    return Response.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
