import { prisma } from './db'
import type { Prisma } from '@prisma/client'

export { getSettings } from './settings'
export type { StoreSettings } from './settings'

export interface ProductFilters {
  q?: string
  category?: string
  brand?: string[]
  size?: string[]
  color?: string[]
  minPrice?: number
  maxPrice?: number
  sort?: 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'rating'
  page?: number
  perPage?: number
  featuredOnly?: boolean
  colorGroup?: string
}

export async function getCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: { where: { isActive: true, deletedAt: null } } } } },
  })
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findFirst({
    where: { slug, isActive: true },
    include: { children: { where: { isActive: true } } },
  })
}

export async function getFacets(categorySlug?: string) {
  const where: Prisma.ProductWhereInput = { isActive: true, deletedAt: null }
  if (categorySlug) where.category = { slug: categorySlug }

  const [brands, sizes, colors, priceRange] = await Promise.all([
    prisma.product.findMany({ where, distinct: ['brand'], select: { brand: true } }),
    prisma.productVariant.findMany({
      where: { isActive: true, product: where },
      distinct: ['name'],
      select: { name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.productVariant.findMany({
      where: { isActive: true, product: where, colorFamily: { not: null } },
      distinct: ['colorFamily'],
      select: { colorFamily: true, hexColor: true },
    }),
    prisma.product.aggregate({ where, _min: { price: true }, _max: { price: true } }),
  ])

  return {
    brands: brands.map((row) => row.brand).filter((brand): brand is string => Boolean(brand)).sort(),
    sizes: sizes.map((row) => row.name),
    colors: colors.filter((row) => row.colorFamily).map((row) => ({ name: row.colorFamily!, hex: row.hexColor })),
    minPrice: priceRange._min.price ?? 0,
    maxPrice: priceRange._max.price ?? 0,
  }
}

export function buildProductWhere(filters: ProductFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { isActive: true, deletedAt: null }

  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: 'insensitive' } },
      { brand: { contains: filters.q, mode: 'insensitive' } },
      { description: { contains: filters.q, mode: 'insensitive' } },
      { details: { contains: filters.q, mode: 'insensitive' } },
    ]
  }
  if (filters.category) where.category = { slug: filters.category }
  if (filters.colorGroup) where.colorGroup = filters.colorGroup
  if (filters.brand?.length) where.brand = { in: filters.brand }
  if (filters.featuredOnly) where.isFeatured = true

  if (filters.size?.length) {
    where.variants = { some: { name: { in: filters.size }, isActive: true, stock: { gt: 0 } } }
  }
  if (filters.color?.length) {
    where.variants = { ...(where.variants as object), some: { colorFamily: { in: filters.color }, isActive: true } }
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {
      ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
    }
  }
  return where
}

function orderByFor(sort: ProductFilters['sort']): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'price-asc':
      return [{ price: 'asc' }]
    case 'price-desc':
      return [{ price: 'desc' }]
    case 'newest':
      return [{ createdAt: 'desc' }]
    case 'rating':
      return [{ reviews: { _count: 'desc' } }]
    default:
      return [{ isFeatured: 'desc' }, { position: 'asc' }, { createdAt: 'desc' }]
  }
}

export async function getProducts(filters: ProductFilters) {
  const page = Math.max(1, filters.page ?? 1)
  const perPage = Math.min(48, Math.max(1, filters.perPage ?? 12))
  const where = buildProductWhere(filters)

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: orderByFor(filters.sort),
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        images: { orderBy: { position: 'asc' } },
        variants: { where: { isActive: true }, orderBy: { position: 'asc' } },
        category: { select: { name: true, slug: true } },
        reviews: { where: { isApproved: true }, select: { rating: true } },
      },
    }),
    prisma.product.count({ where }),
  ])

  return {
    items,
    total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  }
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    include: {
      images: { orderBy: { position: 'asc' } },
      variants: { where: { isActive: true }, orderBy: { position: 'asc' } },
      category: true,
      reviews: {
        where: { isApproved: true },
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true } } },
      },
    },
  })
}

export async function getSiblingProducts(product: { colorGroup: string | null; id: string }) {
  if (!product.colorGroup) return []
  return prisma.product.findMany({
    where: { colorGroup: product.colorGroup, isActive: true, deletedAt: null, id: { not: product.id } },
    include: { images: { orderBy: { position: 'asc' }, take: 1 } },
    orderBy: { position: 'asc' },
    take: 8,
  })
}

export async function getFeaturedProducts(limit = 8) {
  return prisma.product.findMany({
    where: { isActive: true, deletedAt: null, isFeatured: true },
    orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    take: limit,
    include: {
      images: { orderBy: { position: 'asc' } },
      variants: { where: { isActive: true }, orderBy: { position: 'asc' } },
      category: { select: { name: true, slug: true } },
      reviews: { where: { isApproved: true }, select: { rating: true } },
    },
  })
}

export async function getRelatedProducts(productId: string, categoryId: string, limit = 4) {
  return prisma.product.findMany({
    where: { isActive: true, deletedAt: null, categoryId, id: { not: productId } },
    orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    take: limit,
    include: {
      images: { orderBy: { position: 'asc' } },
      variants: { where: { isActive: true }, orderBy: { position: 'asc' } },
      category: { select: { name: true, slug: true } },
      reviews: { where: { isApproved: true }, select: { rating: true } },
    },
  })
}

export async function getActiveCombos() {
  return prisma.combo.findMany({
    where: { isActive: true },
    include: {
      freeProduct: { include: { images: { take: 1 }, variants: { where: { isActive: true }, take: 1 } } },
      items: { include: { product: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getApprovedReviews(productId: string) {
  return prisma.review.findMany({
    where: { productId, isApproved: true },
    orderBy: { createdAt: 'desc' },
    include: { customer: { select: { name: true } } },
  })
}

// ---------------------------------------------------------------------------
// Admin dashboard
// ---------------------------------------------------------------------------

export async function getDashboardStats() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    revenueAgg,
    monthAgg,
    orderCounts,
    pendingCount,
    lowStock,
    abandonedCarts,
    fraudAlerts,
    recentOrders,
    topProducts,
    reviewCount,
    customerCount,
  ] = await Promise.all([
    prisma.order.aggregate({ where: { status: 'DELIVERED' }, _sum: { grandTotal: true } }),
    prisma.order.aggregate({ where: { createdAt: { gte: startOfMonth } }, _sum: { grandTotal: true } }),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.productVariant.count({ where: { isActive: true, stock: { lte: 3 } } }),
    prisma.cart.count({
      where: { items: { some: {} }, lastActivityAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.order.count({ where: { fraudStatus: 'REVIEW' } }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { items: { take: 2 }, parcel: true },
    }),
    prisma.orderItem.groupBy({
      by: ['name'],
      where: { isFreeGift: false },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
    prisma.review.count({ where: { isApproved: false } }),
    prisma.customer.count(),
  ])

  const dailyRevenue = await prisma.order.findMany({
    where: { createdAt: { gte: thirtyDaysAgo }, status: { in: ['DELIVERED', 'CONFIRMED', 'PROCESSING', 'PARCEL_CREATED', 'RIDER_ASSIGNED'] } },
    select: { createdAt: true, grandTotal: true },
  })

  const revenueByDay = new Map<string, number>()
  for (const order of dailyRevenue) {
    const key = order.createdAt.toISOString().slice(0, 10)
    revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + order.grandTotal)
  }

  return {
    totalRevenue: revenueAgg._sum.grandTotal ?? 0,
    monthRevenue: monthAgg._sum.grandTotal ?? 0,
    orderCounts,
    pendingCount,
    lowStock,
    abandonedCarts,
    fraudAlerts,
    recentOrders,
    topProducts,
    pendingReviews: reviewCount,
    customerCount,
    revenueByDay: [...revenueByDay.entries()].sort(([a], [b]) => a.localeCompare(b)),
  }
}
