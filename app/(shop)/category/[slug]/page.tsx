import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ShopBrowser } from '@/components/ShopBrowser'
import { getCategoryBySlug, getFacets, getProducts } from '@/lib/queries'

export const revalidate = 60

export async function generateStaticParams() {
  const { getCategories } = await import('@/lib/queries')
  const categories = await getCategories()
  return categories.map((category) => ({ slug: category.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug)
  if (!category) return { title: 'Category not found' }
  return { title: category.name, description: category.description || undefined }
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = await getCategoryBySlug(params.slug)
  if (!category) notFound()

  const [products, facets] = await Promise.all([
    getProducts({ category: category.slug, page: 1, perPage: 12, sort: 'featured' }),
    getFacets(category.slug),
  ])

  return (
    <Suspense fallback={<div className="container section"><div className="skeleton" style={{ height: 400 }} /></div>}>
      <ShopBrowser
      initialProducts={products.items}
      initialTotal={products.total}
      initialPageCount={products.pageCount}
      facets={facets}
      categorySlug={category.slug}
      basePath={`/category/${category.slug}`}
      heading={category.name}
      description={category.description || undefined}
    />
    </Suspense>
  )
}
