import { NextResponse } from 'next/server'
import { logoutCustomer } from '@/lib/auth'

export async function POST() {
  await logoutCustomer()
  return NextResponse.json({ success: true })
}
