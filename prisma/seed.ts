/**
 * Seed script — creates the owner admin, catalog, variants, combos, coupons,
 * settings and a few demo customers/orders/reviews so the whole flow
 * (storefront → checkout → admin → courier → fraud → marketing) is usable
 * immediately after `npm run db:seed`.
 *
 * Credentials come from environment variables (see .env.example). Nothing is
 * hardcoded in application code.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { hashPassword } from '../lib/crypto'
import { processAndStoreImage } from '../lib/images'
import { DEFAULT_SETTINGS } from '../lib/settings'
import { env } from '../lib/env'
import { prisma } from '../lib/db'

const CUSTOMER_PHONE = process.env.DEMO_CUSTOMER_PHONE || '01712345678'
const CUSTOMER_PASSWORD = process.env.DEMO_CUSTOMER_PASSWORD || 'Customer123'

interface SeedProduct {
  name: string
  slug: string
  brand: string
  price: number
  compareAtPrice?: number
  category: string
  description: string
  details: string
  image: string
  colorGroup?: string
  sizes: string[]
  stock: number[]
  featured?: boolean
}

const PRODUCTS: SeedProduct[] = [
  {
    name: 'Stripe Shirt — Mustard',
    slug: 'stripe-shirt-mustard',
    brand: 'Dockers',
    price: 229500,
    compareAtPrice: 349500,
    category: 'shirts',
    description:
      'A relaxed vertical-stripe casual shirt in mustard and ecru, cut from a breathable cotton-viscose blend with a soft collar and single patch pocket.',
    details:
      'Cotton-viscose blend · Camp collar · Single patch pocket · Curved hem · Machine wash cold · Imported',
    image: 'mustard-stripe-shirt.png',
    colorGroup: 'stripe-shirt',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: [6, 12, 9, 4],
    featured: true,
  },
  {
    name: 'Textured Shirt — Black',
    slug: 'textured-shirt-black',
    brand: 'HUGO',
    price: 449500,
    compareAtPrice: 699500,
    category: 'shirts',
    description:
      'A structured button-down in a fine black textured weave. Tailored through the shoulder with a clean, modern silhouette.',
    details: 'Textured cotton blend · Point collar · Slim fit · Machine wash cold · Imported',
    image: 'black-textured-shirt.png',
    colorGroup: 'textured-shirt',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: [4, 8, 7, 3],
    featured: true,
  },
  {
    name: 'Textured Shirt — White',
    slug: 'textured-shirt-white',
    brand: 'HUGO',
    price: 449500,
    compareAtPrice: 699500,
    category: 'shirts',
    description:
      'The same fine textured weave in optic white — a shirt that works open over a tee or buttoned under a blazer.',
    details: 'Textured cotton blend · Point collar · Slim fit · Machine wash cold · Imported',
    image: 'white-textured-shirt.png',
    colorGroup: 'textured-shirt',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: [5, 10, 6, 2],
  },
  {
    name: 'Slub Linen Shirt — Brown',
    slug: 'slub-linen-shirt-brown',
    brand: 'Dockers',
    price: 229500,
    compareAtPrice: 329500,
    category: 'shirts',
    description:
      'A genuine slub-linen shirt in warm brown. The irregular yarn gives it texture that only improves with every wash.',
    details: '100% slub linen · Camp collar · Relaxed fit · Machine wash cold · Imported',
    image: 'brown-slub-linen-shirt.png',
    colorGroup: 'slub-linen-shirt',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: [3, 9, 11, 5],
    featured: true,
  },
  {
    name: 'Textured Shirt — Beige',
    slug: 'textured-shirt-beige',
    brand: 'HUGO',
    price: 449500,
    compareAtPrice: 699500,
    category: 'shirts',
    description: 'A warm beige take on the textured button-down — the easiest shirt in the collection to wear.',
    details: 'Textured cotton blend · Point collar · Slim fit · Machine wash cold · Imported',
    image: 'beige-textured-shirt.png',
    colorGroup: 'textured-shirt',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: [2, 6, 8, 4],
  },
  {
    name: 'Textured Shirt — Light Blue',
    slug: 'textured-shirt-light-blue',
    brand: 'HUGO',
    price: 449500,
    category: 'shirts',
    description: 'A pale, dusty light blue version of the textured button-down. Sits beautifully against denim.',
    details: 'Textured cotton blend · Point collar · Slim fit · Machine wash cold · Imported',
    image: 'light-blue-textured-shirt.png',
    colorGroup: 'textured-shirt',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: [4, 7, 5, 3],
  },
  {
    name: 'Jeans — Light Blue',
    slug: 'jeans-light-blue',
    brand: 'Lacoste',
    price: 259500,
    compareAtPrice: 399500,
    category: 'pants',
    description:
      'A stone-washed light blue jean with a straight leg and mid rise. Broken-in comfort from the first wear.',
    details: 'Stone-washed cotton denim · Straight leg · Mid rise · Five pocket · Machine wash cold',
    image: 'light-blue-jeans.png',
    colorGroup: 'straight-jeans',
    sizes: ['30', '32', '34', '36'],
    stock: [5, 9, 8, 4],
    featured: true,
  },
  {
    name: 'Jeans — Black',
    slug: 'jeans-black',
    brand: 'Diesel',
    price: 425000,
    compareAtPrice: 649500,
    category: 'pants',
    description: 'Jet black denim with a slim tapered leg and just enough stretch to move with you.',
    details: 'Black cotton denim · Slim tapered leg · Mid rise · Machine wash cold',
    image: 'black-jeans.png',
    colorGroup: 'slim-jeans',
    sizes: ['30', '32', '34', '36'],
    stock: [3, 7, 6, 2],
    featured: true,
  },
  {
    name: 'Jeans — Washed Grey',
    slug: 'jeans-washed-grey',
    brand: 'Diesel',
    price: 425000,
    category: 'pants',
    description: 'A cool washed grey with a slim tapered leg. Pairs with everything in neutral tones.',
    details: 'Washed grey cotton denim · Slim tapered leg · Mid rise · Machine wash cold',
    image: 'grey-jeans.png',
    colorGroup: 'slim-jeans',
    sizes: ['30', '32', '34', '36'],
    stock: [4, 6, 5, 3],
  },
  {
    name: 'Jeans — Stone Blue',
    slug: 'jeans-stone-blue',
    brand: 'BOSS',
    price: 399500,
    category: 'pants',
    description: 'A classic stone blue straight jean with a clean, tailored finish.',
    details: 'Stone blue cotton denim · Straight leg · Mid rise · Machine wash cold',
    image: 'stone-blue-jeans.png',
    colorGroup: 'straight-jeans',
    sizes: ['30', '32', '34', '36'],
    stock: [2, 5, 7, 4],
  },
]

async function seedImage(fileName: string) {
  const filePath = path.join(process.cwd(), 'public', 'images', 'products', fileName)
  try {
    const buffer = await readFile(filePath)
    return processAndStoreImage(buffer, 'products')
  } catch {
    console.warn(`[seed] image missing: ${fileName}`)
    return null
  }
}

async function main() {
  console.log('[seed] ensuring owner admin...')
  const admin = await prisma.admin.upsert({
    where: { email: env.ADMIN_EMAIL.toLowerCase() },
    update: {},
    create: {
      email: env.ADMIN_EMAIL.toLowerCase(),
      passwordHash: await hashPassword(env.ADMIN_PASSWORD),
      name: env.ADMIN_NAME,
      role: 'OWNER',
    },
  })

  console.log('[seed] settings...')
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.setting.upsert({ where: { key }, create: { key, value: value as never }, update: {} })
  }

  console.log('[seed] categories...')
  const categories: Record<string, string> = {}
  const categorySeed = [
    { name: 'Shirts', slug: 'shirts', description: 'Linen, cotton and textured shirts from houses that make them here.' },
    { name: 'Pants', slug: 'pants', description: 'Denim and tailored trousers in a tight edit of washes.' },
    { name: 'Accessories', slug: 'accessories', description: 'Belts, caps and the small things that finish a look.' },
  ]
  for (const [index, category] of categorySeed.entries()) {
    const created = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { position: index },
      create: { ...category, position: index },
    })
    categories[category.slug] = created.id
  }

  console.log('[seed] products...')
  const productBySlug: Record<string, { id: string; price: number; name: string }> = {}
  for (const [index, seed] of PRODUCTS.entries()) {
    const image = await seedImage(seed.image)
    const product = await prisma.product.upsert({
      where: { slug: seed.slug },
      update: {},
      create: {
        name: seed.name,
        slug: seed.slug,
        brand: seed.brand,
        description: seed.description,
        details: seed.details,
        price: seed.price,
        compareAtPrice: seed.compareAtPrice,
        categoryId: categories[seed.category],
        position: index,
        isActive: true,
        isFeatured: Boolean(seed.featured),
        colorGroup: seed.colorGroup,
        seoTitle: `${seed.name} — ${DEFAULT_SETTINGS.storeName}`,
        seoDescription: seed.description.slice(0, 155),
        ...(image
          ? { images: { create: { path: image.path, width: image.width, height: image.height, altText: seed.name } } }
          : {}),
        variants: {
          create: seed.sizes.map((size, variantIndex) => ({
            name: size,
            colorFamily: seed.colorGroup,
            sku: `${seed.slug.toUpperCase()}-${size}`,
            stock: seed.stock[variantIndex] ?? 0,
            lowStockAt: 3,
            position: variantIndex,
          })),
        },
      },
      include: { images: true, variants: true },
    })
    productBySlug[seed.slug] = { id: product.id, price: seed.price, name: seed.name }
  }

  console.log('[seed] combos...')
  const shirtIds = PRODUCTS.filter((product) => product.category === 'shirts').map(
    (product) => productBySlug[product.slug].id,
  )
  const freeGift = productBySlug['jeans-stone-blue']
  const existingCombo = await prisma.combo.findFirst({ where: { name: 'Shirt bundle — buy 2 get 1 free' } })
  if (!existingCombo) {
    await prisma.combo.create({
      data: {
        name: 'Shirt bundle — buy 2 get 1 free',
        description: 'Add any two shirts to your cart and a third piece joins free.',
        buyCount: 2,
        freeProductId: freeGift.id,
        freeQuantity: 1,
        isActive: true,
        items: { create: shirtIds.map((productId) => ({ productId, quantity: 1 })) },
      },
    })
  }

  console.log('[seed] coupons...')
  const coupons = [
    {
      code: 'RUVIO10',
      type: 'PERCENT' as const,
      value: 10,
      description: '10% off your order',
      minSubtotal: 100000,
      maxDiscount: 50000,
    },
    {
      code: 'FIRST300',
      type: 'FIXED' as const,
      value: 30000,
      description: '৳300 off your first order',
      minSubtotal: 150000,
    },
    {
      code: 'FREESHIP',
      type: 'FREE_SHIPPING' as const,
      value: 0,
      description: 'Free delivery anywhere in Bangladesh',
    },
  ]
  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {},
      create: { ...coupon, isActive: true },
    })
  }

  console.log('[seed] demo customer...')
  const customer = await prisma.customer.upsert({
    where: { phone: CUSTOMER_PHONE },
    update: {},
    create: {
      phone: CUSTOMER_PHONE,
      name: 'Rakib Hasan',
      email: 'rakib@example.com',
      passwordHash: await hashPassword(CUSTOMER_PASSWORD),
      addresses: {
        create: [
          {
            label: 'Home',
            recipient: 'Rakib Hasan',
            phone: CUSTOMER_PHONE,
            address: 'House 42, Road 7, Dhanmondi',
            area: 'Dhanmondi',
            city: 'Dhaka',
            district: 'Dhaka',
            isDefault: true,
          },
        ],
      },
    },
  })

  console.log('[seed] demo orders...')
  const statuses = ['DELIVERED', 'RIDER_ASSIGNED', 'PROCESSING', 'CONFIRMED', 'PENDING', 'CANCELLED'] as const
  for (const [index, status] of statuses.entries()) {
    const orderNumber = `RVDEMO${1000 + index}`
    const existing = await prisma.order.findUnique({ where: { orderNumber } })
    if (existing) continue

    const product = PRODUCTS[index % PRODUCTS.length]
    const seedProduct = productBySlug[product.slug]
    const quantity = index % 2 === 0 ? 2 : 1
    const subtotal = seedProduct.price * quantity
    const shipping = 12000
    const grandTotal = subtotal + shipping
    const createdAt = new Date(Date.now() - (index + 1) * 36 * 60 * 60 * 1000)

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        status,
        paymentMethod: 'COD',
        subtotal,
        shippingTotal: shipping,
        grandTotal,
        customerName: 'Rakib Hasan',
        customerPhone: CUSTOMER_PHONE,
        customerEmail: 'rakib@example.com',
        shippingAddress: 'House 42, Road 7, Dhanmondi',
        area: 'Dhanmondi',
        city: 'Dhaka',
        district: 'Dhaka',
        ipAddress: '103.108.20.11',
        riskScore: 5,
        fraudStatus: 'PASSED',
        utmSource: index % 2 === 0 ? 'facebook' : 'google',
        createdAt,
        updatedAt: createdAt,
        confirmedAt: createdAt,
        deliveredAt: status === 'DELIVERED' ? createdAt : null,
        cancelledAt: status === 'CANCELLED' ? createdAt : null,
        items: {
          create: [
            {
              productId: seedProduct.id,
              name: product.name,
              unitPrice: seedProduct.price,
              quantity,
              lineTotal: subtotal,
            },
          ],
        },
        statusHistory: { create: [{ status, note: 'Seeded demo order', actorType: 'SYSTEM', createdAt }] },
        payments: { create: [{ method: 'COD', amount: grandTotal, status: 'UNPAID' }] },
      },
    })

    if (status === 'DELIVERED' || status === 'RIDER_ASSIGNED' || status === 'PROCESSING') {
      await prisma.parcel.create({
        data: {
          orderId: order.id,
          provider: 'STEADFAST',
          consignmentId: `CID-${900000 + index}`,
          trackingCode: `TRK${900000 + index}`,
          status: status === 'DELIVERED' ? 'DELIVERED' : 'APPROVED',
          riderName: status === 'RIDER_ASSIGNED' ? 'Jamal Uddin' : null,
          riderPhone: status === 'RIDER_ASSIGNED' ? '01711000000' : null,
          lastSyncedAt: new Date(),
        },
      })
    }
  }

  console.log('[seed] reviews...')
  const reviewProducts = PRODUCTS.slice(0, 4)
  const reviewBodies = [
    { rating: 5, title: 'Excellent fabric', body: 'The linen is thick and breathes beautifully. Fits true to size.' },
    { rating: 4, title: 'Great value', body: 'Quality is much better than expected at this price. Delivery was quick.' },
    { rating: 5, title: 'Perfect fit', body: 'Wore it twice in a week. Stitching is clean and the colour is exactly as shown.' },
    { rating: 4, title: 'Happy with it', body: 'Good shirt, slightly longer in the sleeve than I expected but still great.' },
  ]
  for (const [index, product] of reviewProducts.entries()) {
    const seedProduct = productBySlug[product.slug]
    const existing = await prisma.review.findFirst({ where: { productId: seedProduct.id } })
    if (existing) continue
    await prisma.review.create({
      data: {
        productId: seedProduct.id,
        customerId: customer.id,
        rating: reviewBodies[index].rating,
        title: reviewBodies[index].title,
        body: reviewBodies[index].body,
        reviewerName: 'Rakib Hasan',
        isApproved: true,
        isVerifiedPurchase: true,
        adminReply: index === 0 ? 'Thank you for the kind words!' : null,
      },
    })
  }

  console.log('[seed] abandoned cart (marketing demo)...')
  const abandonedProduct = productBySlug[PRODUCTS[0].slug]
  const existingCart = await prisma.cart.findFirst({ where: { customerId: customer.id } })
  if (!existingCart) {
    const abandonedVariant = await prisma.productVariant.findFirst({
      where: { productId: abandonedProduct.id, isActive: true },
      orderBy: { position: 'asc' },
    })
    await prisma.cart.create({
      data: {
        customerId: customer.id,
        token: `seed-cart-${Date.now()}`,
        couponCode: 'RUVIO10',
        lastActivityAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
        items: {
          create: [
            {
              productId: abandonedProduct.id,
              variantId: abandonedVariant?.id,
              quantity: 2,
              unitPrice: abandonedProduct.price,
            },
          ],
        },
      },
    })
  }

  console.log('[seed] audit trail...')
  await prisma.auditLog.create({
    data: {
      actorType: 'ADMIN',
      actorId: admin.id,
      action: 'seed.completed',
      entity: 'System',
      summary: 'Database seeded with catalog, demo orders and marketing data',
    },
  })

  console.log('[seed] done.')
  console.log(`[seed] admin login: ${env.ADMIN_EMAIL} (password from ADMIN_PASSWORD)`)
  console.log(`[seed] demo customer: ${CUSTOMER_PHONE} / ${CUSTOMER_PASSWORD}`)
}

main()
  .catch((error) => {
    console.error('[seed] failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
