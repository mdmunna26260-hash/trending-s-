import { NextResponse } from 'next/server'
import { getFacets, getProducts, type ProductFilters } from '@/lib/queries'

export const revalidate = 30

/**
 * Product search / filter / sort / pagination endpoint used by the shop page,
 * category pages and the infinite-scroll loader.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const params = url.searchParams

  const list = (key: string) => params.getAll(key).flatMap((value) => value.split(',')).filter(Boolean)
  const number = (key: string) => {
    const value = params.get(key)
    if (value === null || value === '') return undefined
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  const filters: ProductFilters = {
    q: params.get('q') || undefined,
    category: params.get('category') || undefined,
    brand: list('brand'),
    size: list('size'),
    color: list('color'),
    colorGroup: params.get('colorGroup') || undefined,
    minPrice: number('minPrice'),
    maxPrice: number('maxPrice'),
    sort: (params.get('sort') as ProductFilters['sort']) || 'featured',
    page: number('page') ?? 1,
    perPage: number('perPage') ?? 12,
    featuredOnly: params.get('featured') === '1',
  }

  if (params.get('facets') === '1') {
    return NextResponse.json({ success: true, data: await getFacets(filters.category) })
  }

  const result = await getProducts(filters)
  return NextResponse.json({ success: true, data: result })
}
