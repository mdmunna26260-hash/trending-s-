import { CheckoutForm } from '@/components/CheckoutForm'
import { getSessionCustomer } from '@/lib/session'
import { prisma } from '@/lib/db'
import { getSettings } from '@/lib/settings'

export const metadata = { title: 'Checkout' }

export default async function CheckoutPage() {
  const customer = await getSessionCustomer()
  const [addresses, settings] = await Promise.all([
    customer
      ? prisma.address.findMany({
          where: { customerId: customer.id },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        })
      : Promise.resolve([]),
    getSettings(),
  ])

  return (
    <CheckoutForm
      isLoggedIn={Boolean(customer)}
      customer={customer ? { name: customer.name, phone: customer.phone, email: customer.email } : null}
      addresses={addresses}
      settings={{
        shippingInsideDhaka: settings.shippingInsideDhaka,
        shippingOutsideDhaka: settings.shippingOutsideDhaka,
        freeShippingThreshold: settings.freeShippingThreshold,
        supportPhone: settings.supportPhone,
      }}
    />
  )
}
