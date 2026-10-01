import { prisma } from '@/lib/db'

export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true, deletedAt: null }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
  ])

  return [
    { url: base, changeFrequency: 'daily' as const, priority: 1 },
    { url: `${base}/shop`, changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${base}/about`, changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${base}/contact`, changeFrequency: 'monthly' as const, priority: 0.4 },
    ...categories.map((category) => ({
      url: `${base}/category/${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      url: `${base}/product/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
