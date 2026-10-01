import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSessionCustomer } from '@/lib/session'
import { isValidBdPhone, normalizePhone } from '@/lib/http'
import { handleError } from '@/lib/api-helpers'

const schema = z.object({
  label: z.string().max(60).optional(),
  recipient: z.string().min(2).max(120),
  phone: z.string().min(11).max(20),
  address: z.string().min(5).max(400),
  area: z.string().max(120).optional(),
  city: z.string().min(2).max(80),
  district: z.string().min(2).max(80),
  postcode: z.string().max(20).optional(),
  isDefault: z.boolean().optional(),
})

export async function POST(request: Request) {
  try {
    const customer = await getSessionCustomer()
    if (!customer) return Response.json({ success: false, error: 'Please log in' }, { status: 401 })

    const body = schema.parse(await request.json())
    const phone = normalizePhone(body.phone)
    if (!isValidBdPhone(phone)) {
      return Response.json({ success: false, error: 'Enter a valid phone number' }, { status: 400 })
    }

    const isFirst = (await prisma.address.count({ where: { customerId: customer.id } })) === 0

    if (body.isDefault || isFirst) {
      await prisma.address.updateMany({ where: { customerId: customer.id }, data: { isDefault: false } })
    }

    const address = await prisma.address.create({
      data: {
        customerId: customer.id,
        label: body.label || 'Home',
        recipient: body.recipient,
        phone,
        address: body.address,
        area: body.area || null,
        city: body.city,
        district: body.district,
        postcode: body.postcode || null,
        isDefault: body.isDefault || isFirst,
      },
    })

    return Response.json({ success: true, data: address })
  } catch (error) {
    return handleError(error)
  }
}
