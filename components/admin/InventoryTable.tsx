'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Row {
  id: string
  name: string
  colorFamily: string | null
  stock: number
  lowStockAt: number
  isActive: boolean
  product: { name: string; slug: string; sku: string | null }
}

export function InventoryTable({ rows, threshold }: { rows: Row[]; threshold: number }) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const save = async (id: string) => {
    setBusy(true)
    try {
      await fetch(`/api/admin/inventory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: Number(values[id] ?? 0), reason: 'Manual adjustment from inventory screen' }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="table-wrap">
      <table className="table table--compact">
        <thead>
          <tr>
            <th>Product</th>
            <th>Variant</th>
            <th>SKU</th>
            <th>Stock</th>
            <th>Adjust</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.product.name}</td>
              <td>
                {row.name}
                {row.colorFamily ? <span className="small muted"> · {row.colorFamily}</span> : null}
              </td>
              <td className="small muted">{row.product.sku || '—'}</td>
              <td>
                <span className={`badge ${row.stock === 0 ? 'badge--danger' : row.stock <= threshold ? 'badge--warn' : 'badge--ok'}`}>
                  {row.stock}
                </span>
              </td>
              <td>
                <input
                  className="input"
                  style={{ maxWidth: 90 }}
                  type="number"
                  min="0"
                  value={values[row.id] ?? row.stock}
                  onChange={(event) => setValues({ ...values, [row.id]: event.target.value })}
                />
              </td>
              <td>
                <button type="button" className="link-underline" disabled={busy} onClick={() => save(row.id)}>
                  Save
                </button>
              </td>
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td colSpan={6} className="center muted">
                No variants found.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
