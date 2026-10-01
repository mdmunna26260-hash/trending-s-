import { NextResponse } from 'next/server'
import { getSessionCustomer } from '@/lib/session'

export async function GET() {
  const customer = await getSessionCustomer()
  if (!customer) return NextResponse.json({ success: true, data: null })
  return NextResponse.json({
    success: true,
    data: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      riskScore: customer.riskScore,
    },
  })
}
