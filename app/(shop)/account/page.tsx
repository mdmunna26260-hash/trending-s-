import { AccountPanel } from '@/components/AccountPanel'
import { AuthPanel } from '@/components/AuthPanel'
import { getSessionCustomer } from '@/lib/session'
import { prisma } from '@/lib/db'

export const metadata = { title: 'My account' }
export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const customer = await getSessionCustomer()
  if (!customer) return <AuthPanel />

  const [orders, wishlist, addresses, reviews] = await Promise.all([
    prisma.order.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      include: { items: true, parcel: true },
    }),
    prisma.wishlistItem.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            images: { orderBy: { position: 'asc' } },
            variants: { where: { isActive: true }, orderBy: { position: 'asc' } },
            category: { select: { name: true, slug: true } },
            reviews: { where: { isApproved: true }, select: { rating: true } },
          },
        },
      },
    }),
    prisma.address.findMany({ where: { customerId: customer.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] }),
    prisma.review.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { name: true, slug: true } } },
    }),
  ])

  return (
    <AccountPanel
      customer={{ id: customer.id, name: customer.name, phone: customer.phone, email: customer.email }}
      orders={orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        grandTotal: order.grandTotal,
        createdAt: order.createdAt.toISOString(),
        itemCount: order.items.length,
        trackingCode: order.parcel?.trackingCode ?? null,
      }))}
      wishlist={wishlist.map((item) => ({
        id: item.id,
        product: {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          brand: item.product.brand,
          price: item.product.price,
          compareAtPrice: item.product.compareAtPrice,
          images: item.product.images,
          variants: item.product.variants,
          category: item.product.category,
          reviews: item.product.reviews,
        },
      }))}
      addresses={addresses}
      reviews={reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        body: review.body,
        isApproved: review.isApproved,
        createdAt: review.createdAt.toISOString(),
        product: review.product,
      }))}
    />
  )
}
