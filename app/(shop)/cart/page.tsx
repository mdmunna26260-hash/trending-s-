import Link from 'next/link'
import { CartView } from '@/components/CartView'
import { getSessionCustomer } from '@/lib/session'
import { prisma } from '@/lib/db'

export const metadata = { title: 'Your bag' }

export default async function CartPage() {
  const customer = await getSessionCustomer()
  const addresses = customer
    ? await prisma.address.findMany({ where: { customerId: customer.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] })
    : []

  return <CartView isLoggedIn={Boolean(customer)} addresses={addresses} />
}
