'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ProductCard } from './ProductCard'
import { formatMoney } from '@/lib/utils'
import type { ProductFilters } from '@/lib/queries'

export interface Facets {
  brands: string[]
  sizes: string[]
  colors: Array<{ value: string; name: string; hex: string | null }>
  minPrice: number
  maxPrice: number
}

interface ShopBrowserProps {
  initialProducts: any[]
  initialTotal: number
  initialPageCount: number
  facets: Facets
  categorySlug?: string
  basePath?: string
  heading: string
  description?: string
  perPage?: number
}

const SORTS: Array<{ value: NonNullable<ProductFilters['sort']>; label: string }> = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Most reviewed' },
]

export function ShopBrowser({
  initialProducts,
  initialTotal,
  initialPageCount,
  facets,
  categorySlug,
  basePath = '/shop',
  heading,
  description,
  perPage = 12,
}: ShopBrowserProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<any[]>(initialProducts)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(initialPageCount)
  const [loading, setLoading] = useState(false)
  const [sort, setSort] = useState<NonNullable<ProductFilters['sort']>>(
    (searchParams.get('sort') as any) || 'featured',
  )
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [brands, setBrands] = useState<string[]>(searchParams.getAll('brand'))
  const [sizes, setSizes] = useState<string[]>(searchParams.getAll('size'))
  const [colors, setColors] = useState<string[]>(searchParams.getAll('color'))
  const [priceMax, setPriceMax] = useState<number>(Number(searchParams.get('maxPrice') || facets.maxPrice || 0))
  const sentinel = useRef<HTMLDivElement>(null)

  const filtersKey = useMemo(
    () =>
      JSON.stringify({
        category: categorySlug,
        q: query.trim(),
        brand: [...brands].sort(),
        size: [...sizes].sort(),
        color: [...colors].sort(),
        sort,
        maxPrice: priceMax,
      }),
    [categorySlug, query, brands, sizes, colors, sort, priceMax],
  )

  const buildParams = useCallback(
    (pageNumber: number) => {
      const params = new URLSearchParams()
      if (categorySlug) params.set('category', categorySlug)
      if (query.trim()) params.set('q', query.trim())
      brands.forEach((brand) => params.append('brand', brand))
      sizes.forEach((size) => params.append('size', size))
      colors.forEach((color) => params.append('color', color))
      if (priceMax && priceMax < facets.maxPrice) params.set('maxPrice', String(priceMax))
      if (sort !== 'featured') params.set('sort', sort)
      params.set('page', String(pageNumber))
      params.set('perPage', String(perPage))
      return params
    },
    [categorySlug, query, brands, sizes, colors, sort, priceMax, facets.maxPrice, perPage],
  )

  // Reset + fetch page 1 whenever any filter changes.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/products?${buildParams(1).toString()}`)
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled || !payload.success) return
        setProducts(payload.data.items)
        setTotal(payload.data.total)
        setPage(1)
        setPageCount(payload.data.pageCount)
      })
      .finally(() => !cancelled && setLoading(false))

    const params = buildParams(1)
    params.delete('page')
    params.delete('perPage')
    router.replace(`${basePath}?${params.toString()}`, { scroll: false })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey])

  const loadMore = useCallback(async () => {
    if (loading || page >= pageCount) return
    setLoading(true)
    try {
      const response = await fetch(`/api/products?${buildParams(page + 1).toString()}`)
      const payload = await response.json()
      if (payload.success) {
        setProducts((current) => [...current, ...payload.data.items])
        setPage(payload.data.page)
      }
    } finally {
      setLoading(false)
    }
  }, [buildParams, loading, page, pageCount])

  // Infinite scroll with IntersectionObserver.
  useEffect(() => {
    const node = sentinel.current
    if (!node) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore()
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [loadMore])

  const toggle = (value: string, list: string[], setter: (next: string[]) => void) =>
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value])

  return (
    <div className="container section">
      <header className="mb-5">
        <div className="eyebrow">{categorySlug ? 'Category' : 'Shop'}</div>
        <h1 className="display-2 mt-2">{heading}</h1>
        {description ? <p className="lede mt-3" style={{ maxWidth: '60ch' }}>{description}</p> : null}
      </header>

      <div className="grid grid--sidebar" style={{ gap: 'clamp(1.5rem,1rem + 2vw,3rem)' }}>
        {/* ------------------------------------------------------- filters -- */}
        <aside className="surface pad stack" style={{ gap: '1.5rem' }}>
          <div className="field">
            <label htmlFor="shop-search">Search</label>
            <input
              id="shop-search"
              className="input"
              type="search"
              value={query}
              placeholder="Search products"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="filter-group">
            <div className="filter-group__title">Sort by</div>
            <select className="select" value={sort} onChange={(event) => setSort(event.target.value as any)}>
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {facets.brands.length > 1 ? (
            <div className="filter-group">
              <div className="filter-group__title">Brand</div>
              <div className="stack" style={{ gap: '0.4rem' }}>
                {facets.brands.map((brand) => (
                  <label key={brand} className="checkbox">
                    <input
                      type="checkbox"
                      checked={brands.includes(brand)}
                      onChange={() => toggle(brand, brands, setBrands)}
                    />
                    <span>{brand}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {facets.sizes.length ? (
            <div className="filter-group">
              <div className="filter-group__title">Size</div>
              <div className="chip-row">
                {facets.sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className="chip"
                    aria-pressed={sizes.includes(size)}
                    onClick={() => toggle(size, sizes, setSizes)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {facets.colors.length ? (
            <div className="filter-group">
              <div className="filter-group__title">Colour family</div>
              <div className="chip-row">
                {facets.colors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className="chip chip--color"
                    aria-pressed={colors.includes(color.value)}
                    onClick={() => toggle(color.value, colors, setColors)}
                  >
                    {color.hex ? <span className="swatch" style={{ background: color.hex }} /> : null}
                    {color.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {facets.maxPrice > 0 ? (
            <div className="filter-group">
              <div className="filter-group__title">Max price · {formatMoney(priceMax || facets.maxPrice)}</div>
              <input
                type="range"
                min={facets.minPrice}
                max={facets.maxPrice}
                step={1000}
                value={priceMax || facets.maxPrice}
                onChange={(event) => setPriceMax(Number(event.target.value))}
                aria-label="Maximum price"
              />
            </div>
          ) : null}

          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              setQuery('')
              setBrands([])
              setSizes([])
              setColors([])
              setPriceMax(facets.maxPrice)
              setSort('featured')
            }}
          >
            Clear filters
          </button>
        </aside>

        {/* ------------------------------------------------------- results -- */}
        <section>
          <div className="toolbar mb-4">
            <p className="small muted">
              {total} {total === 1 ? 'piece' : 'pieces'}
              {loading ? ' · updating…' : ''}
            </p>
            <div className="row gap-2">
              {[brands, sizes, colors].some((list) => list.length) || query ? (
                <span className="badge badge--info">Filters active</span>
              ) : null}
            </div>
          </div>

          {products.length ? (
            <>
              <div className="grid grid--products">
                {products.map((product, index) => (
                  <ProductCard key={product.id} product={product} eager={index < 4} />
                ))}
              </div>
              <div ref={sentinel} style={{ height: 1 }} />
              <div className="center mt-6">
                {page < pageCount ? (
                  <button type="button" className="btn btn--ghost" onClick={loadMore} disabled={loading}>
                    {loading ? 'Loading…' : `Load more (${total - products.length} left)`}
                  </button>
                ) : (
                  <p className="small muted">You have reached the end of the collection.</p>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>No products match those filters.</p>
              <button
                type="button"
                className="btn btn--ghost mt-4"
                onClick={() => {
                  setQuery('')
                  setBrands([])
                  setSizes([])
                  setColors([])
                  setPriceMax(facets.maxPrice)
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
