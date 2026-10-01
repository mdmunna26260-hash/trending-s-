import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { updateSettings, DEFAULT_SETTINGS } from '@/lib/settings'
import { prisma } from '@/lib/db'
import { handleError } from '@/lib/api-helpers'

const schema = z.object({
  storeName: z.string().min(1).max(120).optional(),
  tagline: z.string().max(300).optional(),
  supportPhone: z.string().max(40).optional(),
  whatsappNumber: z.string().max(40).optional(),
  supportEmail: z.string().email().optional(),
  address: z.string().max(300).optional(),
  announcement: z.string().max(300).optional(),
  shippingInsideDhaka: z.number().int().min(0).optional(),
  shippingOutsideDhaka: z.number().int().min(0).optional(),
  freeShippingThreshold: z.number().int().min(0).optional(),
  codFeePercent: z.number().min(0).max(20).optional(),
  codFeeFlat: z.number().int().min(0).optional(),
  minOrderValue: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).max(100).optional(),
  autoParcelOnConfirm: z.boolean().optional(),
  requireReviewApproval: z.boolean().optional(),
  orderPrefix: z.string().max(10).optional(),
  maintenanceMode: z.boolean().optional(),
  metaPixelId: z.string().max(40).optional(),
  ga4MeasurementId: z.string().max(40).optional(),
  gtmId: z.string().max(40).optional(),
})

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin('settings.manage')
    const body = schema.parse(await request.json())
    const settings = await updateSettings(body)

    await prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: admin.id,
        action: 'settings.updated',
        entity: 'Setting',
        summary: Object.keys(body).join(', '),
      },
    })

    return Response.json({ success: true, data: settings })
  } catch (error) {
    return handleError(error)
  }
}

export async function GET() {
  return Response.json({ success: true, data: DEFAULT_SETTINGS })
}
