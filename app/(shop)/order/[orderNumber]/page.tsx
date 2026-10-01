import { OrderTracker } from '@/components/OrderTracker'
import { prisma } from '@/lib/db'

export const metadata = { title: 'Track your order' }

export default async function OrderTrackingPage({
  params,
  searchParams,
}: {
  params: { orderNumber: string }
  searchParams: { placed?: string; token?: string }
}) {
  // Light server-side existence check so unknown order numbers 404 immediately.
  const order = await prisma.order.findUnique({
    where: { orderNumber: params.orderNumber },
    select: { orderNumber: true },
  })

  if (!order) {
    return (
      <div className="container section container--narrow">
        <h1 className="display-2">Order not found</h1>
        <p className="lede mt-3">
          We could not find an order with that number. Check the number in your confirmation message or contact support.
        </p>
      </div>
    )
  }

  return (
    <OrderTracker
      orderNumber={params.orderNumber}
      initialToken={searchParams.token || null}
      justPlaced={searchParams.placed === '1'}
    />
  )
}
