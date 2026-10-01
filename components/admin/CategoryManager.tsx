'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { srcSetFor } from '@/lib/utils'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  imagePath: string | null
  position: number
  isActive: boolean
  _count?: { products: number }
  children?: Array<{ id: string; name: string }>
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', slug: '', description: '', position: 0, isActive: true })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await response.json()
      if (payload.success) {
        setMessage(`Category "${payload.data.name}" created`)
        setForm({ name: '', slug: '', description: '', position: 0, isActive: true })
        router.refresh()
      } else {
        setError(payload.error)
      }
    } finally {
      setBusy(false)
    }
  }

  const uploadImage = async (categoryId: string, file: File) => {
    const body = new FormData()
    body.append('file', file)
    body.append('folder', 'categories')
    const response = await fetch('/api/upload', { method: 'POST', body })
    const payload = await response.json()
    if (payload.success) {
      await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagePath: payload.data.path, imageAlt: file.name }),
      })
      router.refresh()
    } else {
      setError(payload.error)
    }
  }

  const patch = async (categoryId: string, data: Record<string, unknown>) => {
    const response = await fetch(`/api/admin/categories/${categoryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const payload = await response.json()
    if (!payload.success) setError(payload.error)
    else router.refresh()
  }

  const remove = async (categoryId: string) => {
    const response = await fetch(`/api/admin/categories/${categoryId}`, { method: 'DELETE' })
    const payload = await response.json()
    if (payload.success) router.refresh()
    else setError(payload.error)
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
      <form className="surface pad stack" style={{ gap: '1rem' }} onSubmit={create}>
        <h2 className="label">New category</h2>
        <div className="field">
          <label htmlFor="category-name">Name</label>
          <input
            id="category-name"
            className="input"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="category-slug">Slug</label>
          <input
            id="category-slug"
            className="input"
            value={form.slug}
            onChange={(event) => setForm({ ...form, slug: event.target.value })}
            placeholder="auto from name"
          />
        </div>
        <div className="field">
          <label htmlFor="category-description">Description</label>
          <textarea
            id="category-description"
            className="textarea"
            style={{ minHeight: 80 }}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </div>
        <div className="row gap-3">
          <div className="field">
            <label htmlFor="category-position">Position</label>
            <input
              id="category-position"
              className="input"
              type="number"
              min="0"
              value={form.position}
              onChange={(event) => setForm({ ...form, position: Number(event.target.value) })}
            />
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
            />
            <span>Active</span>
          </label>
        </div>
        <button type="submit" className="btn" disabled={busy}>
          Create category
        </button>
        {message ? <p className="alert alert--ok">{message}</p> : null}
        {error ? <p className="alert alert--danger">{error}</p> : null}
      </form>

      <div className="surface pad">
        <h2 className="label" style={{ marginBottom: '0.75rem' }}>
          Existing categories
        </h2>
        <div className="stack" style={{ gap: '1rem' }}>
          {categories.map((category) => (
            <div key={category.id} className="stack" style={{ gap: '0.5rem' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>{category.name}</strong>
                  <div className="small muted">
                    /{category.slug} · {category._count?.products ?? 0} products
                  </div>
                </div>
                <div className="row gap-2">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => patch(category.id, { isActive: !category.isActive })}
                  >
                    {category.isActive ? 'Hide' : 'Show'}
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => remove(category.id)}>
                    Delete
                  </button>
                </div>
              </div>

              <div className="row gap-3" style={{ alignItems: 'center' }}>
                {category.imagePath ? (
                  <img
                    src={category.imagePath}
                    srcSet={srcSetFor(category.imagePath)}
                    sizes="80px"
                    alt={category.name}
                    width={80}
                    height={80}
                    style={{ objectFit: 'cover', borderRadius: 3 }}
                  />
                ) : (
                  <div className="skeleton" style={{ width: 80, height: 80 }} />
                )}
                <label className="btn btn--ghost btn--sm" style={{ cursor: 'pointer' }}>
                  {category.imagePath ? 'Replace image' : 'Upload image'}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) uploadImage(category.id, file)
                    }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
