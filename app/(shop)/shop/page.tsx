import { Suspense } from 'react'
import { ShopBrowser } from '@/components/ShopBrowser'
import { getFacets, getProducts } from '@/lib/queries'
import type { Metadata } from 'next'

export const revalidate = 30

export async function generateMetadata({ searchParams }: { searchParams: Record<string, string | undefined> }): Promise<Metadata> {
  return {
    title: searchParams.q ? `Search: ${searchParams.q}` : 'Shop all',
    description: 'Browse the full collection of factory-fresh shirts, denim and trousers.',
  }
}

export default async function ShopPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const first = (key: string) => {
    const value = searchParams[key]
    return Array.isArray(value) ? value[0] : value
  }
  const list = (key: string) => {
    const value = searchParams[key]
    if (!value) return []
    return (Array.isArray(value) ? value : [value]).flatMap((entry) => String(entry).split(',')).filter(Boolean)
  }

  const filters = {
    q: first('q'),
    brand: list('brand'),
    size: list('size'),
    color: list('color'),
    sort: (first('sort') as any) || 'featured',
    maxPrice: first('maxPrice') ? Number(first('maxPrice')) : undefined,
    page: 1,
    perPage: 12,
  }

  const [products, facets] = await Promise.all([
    getProducts(filters),
    getFacets(),
  ])

  return (
    <Suspense fallback={<div className="container section"><div className="skeleton" style={{ height: 400 }} /></div>}>
      <ShopBrowser
      initialProducts={products.items}
      initialTotal={products.total}
      initialPageCount={products.pageCount}
      facets={facets}
      heading={filters.q ? `Results for “${filters.q}”` : 'The collection'}
      description="Every piece here is factory-fresh — same production lines, brand labels sewn in, priced without the journey."
    />
    </Suspense>
  )
}
