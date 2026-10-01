import { cookies } from 'next/headers'
import { prisma } from './db'
import { sha256 } from './crypto'
import { CUSTOMER_COOKIE } from './auth'
import type { Customer } from '@prisma/client'

/** Server-side helper: the signed-in customer (or null). */
export async function getSessionCustomer(): Promise<Customer | null> {
  const token = cookies().get(CUSTOMER_COOKIE)?.value
  if (!token) return null
  const session = await prisma.customerSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { customer: true },
  })
  if (!session || session.expiresAt < new Date()) return null
  if (session.customer.isBlocked) return null
  return session.customer
}

export async function isLoggedInCustomer(): Promise<boolean> {
  return Boolean(await getSessionCustomer())
}
