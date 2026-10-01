'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatMoney, srcSetFor } from '@/lib/utils'

interface Variant {
  id?: string
  name: string
  colorFamily: string
  hexColor: string
  sku: string
  priceOverride: string
  stock: number
  lowStockAt: number
  isActive: boolean
}

interface ImageRow {
  id?: string
  path: string
  altText: string
}

interface Category {
  id: string
  name: string
}

export function ProductForm({
  mode,
  product,
  categories,
}: {
  mode: 'create' | 'edit'
  product?: {
    id: string
    name: string
    slug: string
    brand: string | null
    description: string | null
    details: string | null
    price: number
    compareAtPrice: number | null
    costPrice: number | null
    categoryId: string
    position: number
    isActive: boolean
    isFeatured: boolean
    colorGroup: string | null
    seoTitle: string | null
    seoDescription: string | null
    weightGrams: number
    variants: Variant[]
    images: ImageRow[]
  }
  categories: Category[]
}) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: product?.name || '',
    slug: product?.slug || '',
    brand: product?.brand || '',
    categoryId: product?.categoryId || categories[0]?.id || '',
    price: product ? String(product.price / 100) : '',
    compareAtPrice: product?.compareAtPrice ? String(product.compareAtPrice / 100) : '',
    costPrice: product?.costPrice ? String(product.costPrice / 100) : '',
    position: product?.position ?? 0,
    colorGroup: product?.colorGroup || '',
    description: product?.description || '',
    details: product?.details || '',
    seoTitle: product?.seoTitle || '',
    seoDescription: product?.seoDescription || '',
    weightGrams: product?.weightGrams ?? 500,
    isActive: product?.isActive ?? true,
    isFeatured: product?.isFeatured ?? false,
  })
  const [variants, setVariants] = useState<Variant[]>(
    product?.variants?.length
      ? product.variants
      : [
          {
            name: 'M',
            colorFamily: '',
            hexColor: '',
            sku: '',
            priceOverride: '',
            stock: 10,
            lowStockAt: 3,
            isActive: true,
          },
        ],
  )
  const [images, setImages] = useState<ImageRow[]>(product?.images || [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const update = (key: keyof typeof form, value: unknown) => setForm((current) => ({ ...current, [key]: value }))

  const updateVariant = (index: number, patch: Partial<Variant>) =>
    setVariants((current) => current.map((variant, position) => (position === index ? { ...variant, ...patch } : variant)))

  const upload = async (file: File) => {
    const body = new FormData()
    body.append('file', file)
    body.append('folder', 'products')
    if (product?.id) body.append('productId', product.id)
    const response = await fetch('/api/upload', { method: 'POST', body })
    const payload = await response.json()
    if (payload.success) {
      setImages((current) => [...current, { path: payload.data.path, altText: form.name || file.name }])
    } else {
      setError(payload.error)
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const payload = {
        name: form.name,
        slug: form.slug || undefined,
        brand: form.brand || null,
        categoryId: form.categoryId,
        price: Math.round(Number(form.price) * 100),
        compareAtPrice: form.compareAtPrice ? Math.round(Number(form.compareAtPrice) * 100) : null,
        costPrice: form.costPrice ? Math.round(Number(form.costPrice) * 100) : null,
        position: Number(form.position) || 0,
        colorGroup: form.colorGroup || null,
        description: form.description || null,
        details: form.details || null,
        seoTitle: form.seoTitle || null,
        seoDescription: form.seoDescription || null,
        weightGrams: Number(form.weightGrams) || 500,
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        variants: variants.map((variant) => ({
          id: variant.id,
          name: variant.name,
          colorFamily: variant.colorFamily || null,
          hexColor: variant.hexColor || null,
          sku: variant.sku || null,
          priceOverride: variant.priceOverride ? Math.round(Number(variant.priceOverride) * 100) : null,
          stock: Number(variant.stock) || 0,
          lowStockAt: Number(variant.lowStockAt) || 3,
          isActive: variant.isActive,
        })),
        images: images.map((image, index) => ({ id: image.id, path: image.path, altText: image.altText, position: index })),
      }

      const response = await fetch(mode === 'create' ? '/api/admin/products' : `/api/admin/products/${product!.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (result.success) {
        setMessage(mode === 'create' ? 'Product created' : 'Product updated')
        if (mode === 'create') router.push(`/admin/products/${result.data.id}`)
        else router.refresh()
      } else {
        setError(result.error)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="stack" style={{ gap: '1.5rem' }} onSubmit={submit}>
      <div className="surface pad stack" style={{ gap: '1rem' }}>
        <h2 className="label">Basics</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div className="field">
            <label htmlFor="name">Product name</label>
            <input id="name" className="input" value={form.name} onChange={(event) => update('name', event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="slug">URL slug (optional)</label>
            <input id="slug" className="input" value={form.slug} onChange={(event) => update('slug', event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="brand">Brand</label>
            <input id="brand" className="input" value={form.brand} onChange={(event) => update('brand', event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              className="select"
              value={form.categoryId}
              onChange={(event) => update('categoryId', event.target.value)}
              required
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            className="textarea"
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="details">Details &amp; fabric</label>
          <textarea
            id="details"
            className="textarea"
            value={form.details}
            onChange={(event) => update('details', event.target.value)}
          />
        </div>
      </div>

      <div className="surface pad stack" style={{ gap: '1rem' }}>
        <h2 className="label">Pricing &amp; visibility</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div className="field">
            <label htmlFor="price">Price (৳)</label>
            <input
              id="price"
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(event) => update('price', event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="compareAtPrice">Compare-at price (৳)</label>
            <input
              id="compareAtPrice"
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={form.compareAtPrice}
              onChange={(event) => update('compareAtPrice', event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="costPrice">Cost price (৳)</label>
            <input
              id="costPrice"
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={form.costPrice}
              onChange={(event) => update('costPrice', event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="position">Position</label>
            <input
              id="position"
              className="input"
              type="number"
              min="0"
              value={form.position}
              onChange={(event) => update('position', event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="colorGroup">Colour group (sibling colours)</label>
            <input
              id="colorGroup"
              className="input"
              value={form.colorGroup}
              onChange={(event) => update('colorGroup', event.target.value)}
              placeholder="textured-shirt"
            />
          </div>
          <div className="field">
            <label htmlFor="weight">Weight (g)</label>
            <input
              id="weight"
              className="input"
              type="number"
              min="0"
              value={form.weightGrams}
              onChange={(event) => update('weightGrams', event.target.value)}
            />
          </div>
        </div>

        <div className="row gap-4" style={{ flexWrap: 'wrap' }}>
          <label className="checkbox">
            <input type="checkbox" checked={form.isActive} onChange={(event) => update('isActive', event.target.checked)} />
            <span>Active (visible in storefront)</span>
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(event) => update('isFeatured', event.target.checked)}
            />
            <span>Featured on homepage</span>
          </label>
        </div>
      </div>

      <div className="surface pad stack" style={{ gap: '1rem' }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 className="label">Sizes &amp; stock</h2>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setVariants((current) => [...current, { name: '', colorFamily: form.colorGroup, hexColor: '', sku: '', priceOverride: '', stock: 0, lowStockAt: 3, isActive: true }])}>
            Add size
          </button>
        </div>

        <div className="table-wrap">
          <table className="table table--compact">
            <thead>
              <tr>
                <th>Size</th>
                <th>Colour family</th>
                <th>Hex</th>
                <th>SKU</th>
                <th>Price override (৳)</th>
                <th>Stock</th>
                <th>Low at</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {variants.map((variant, index) => (
                <tr key={index}>
                  <td>
                    <input
                      className="input"
                      value={variant.name}
                      onChange={(event) => updateVariant(index, { name: event.target.value })}
                      required
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      value={variant.colorFamily}
                      onChange={(event) => updateVariant(index, { colorFamily: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      value={variant.hexColor}
                      onChange={(event) => updateVariant(index, { hexColor: event.target.value })}
                      placeholder="#a9b6c4"
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      value={variant.sku}
                      onChange={(event) => updateVariant(index, { sku: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={variant.priceOverride}
                      onChange={(event) => updateVariant(index, { priceOverride: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      value={variant.stock}
                      onChange={(event) => updateVariant(index, { stock: Number(event.target.value) })}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      value={variant.lowStockAt}
                      onChange={(event) => updateVariant(index, { lowStockAt: Number(event.target.value) })}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={variant.isActive}
                      onChange={(event) => updateVariant(index, { isActive: event.target.checked })}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="link-underline"
                      onClick={() => setVariants((current) => current.filter((_, position) => position !== index))}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="surface pad stack" style={{ gap: '1rem' }}>
        <h2 className="label">Images</h2>
        <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
          {images.map((image, index) => (
            <div key={image.path} style={{ position: 'relative' }}>
              <img
                src={image.path}
                srcSet={srcSetFor(image.path)}
                sizes="120px"
                alt={image.altText}
                width={120}
                height={150}
                style={{ objectFit: 'cover', borderRadius: 3 }}
              />
              <button
                type="button"
                className="flag flag--berry"
                onClick={() => setImages((current) => current.filter((_, position) => position !== index))}
              >
                Remove
              </button>
            </div>
          ))}
          <label className="btn btn--ghost btn--sm" style={{ cursor: 'pointer' }}>
            Upload image
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) upload(file)
              }}
            />
          </label>
        </div>
        <p className="small muted">Images are converted to responsive WebP (400/800/1200/1600px) automatically.</p>
      </div>

      <div className="surface pad stack" style={{ gap: '1rem' }}>
        <h2 className="label">SEO</h2>
        <div className="field">
          <label htmlFor="seoTitle">Meta title</label>
          <input id="seoTitle" className="input" value={form.seoTitle} onChange={(event) => update('seoTitle', event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="seoDescription">Meta description</label>
          <textarea
            id="seoDescription"
            className="textarea"
            style={{ minHeight: 70 }}
            value={form.seoDescription}
            onChange={(event) => update('seoDescription', event.target.value)}
          />
        </div>
      </div>

      {error ? <p className="alert alert--danger">{error}</p> : null}
      {message ? <p className="alert alert--ok">{message}</p> : null}

      <div className="row gap-3">
        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Saving…' : mode === 'create' ? 'Create product' : 'Save changes'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => router.push('/admin/products')}>
          Cancel
        </button>
        {form.price ? <span className="small muted">Saving at {formatMoney(Math.round(Number(form.price) * 100))}</span> : null}
      </div>
    </form>
  )
}
