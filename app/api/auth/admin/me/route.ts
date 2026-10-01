import { NextResponse } from 'next/server'
import { getAdmin, permissionsFor } from '@/lib/auth'

export async function GET() {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ success: true, data: null })
  return NextResponse.json({
    success: true,
    data: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      permissions: permissionsFor(admin.role),
    },
  })
}
