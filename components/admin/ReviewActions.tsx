'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'

interface Review {
  id: string
  rating: number
  title: string | null
  body: string
  reviewerName: string
  isApproved: boolean
  isVerifiedPurchase: boolean
  adminReply: string | null
  createdAt: string
  product: { name: string; slug: string }
  customer: { name: string | null; phone: string } | null
}

export function ReviewManager({ reviews }: { reviews: Review[] }) {
  const router = useRouter()
  const [reply, setReply] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const act = async (id: string, data: Record<string, unknown>) => {
    setBusy(true)
    try {
      await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack" style={{ gap: '1rem' }}>
      {reviews.map((review) => (
        <article key={review.id} className="surface pad stack" style={{ gap: '0.6rem' }}>
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <strong>{review.product.name}</strong>
              <div className="small muted">
                {review.reviewerName}
                {review.customer?.phone ? ` · ${review.customer.phone}` : ''} · {formatDateTime(review.createdAt)}
              </div>
            </div>
            <div className="row gap-2">
              <span className="badge">{'★'.repeat(review.rating)}</span>
              {review.isVerifiedPurchase ? <span className="badge badge--ok">verified</span> : null}
              <span className={`badge ${review.isApproved ? 'badge--ok' : 'badge--warn'}`}>
                {review.isApproved ? 'published' : 'pending'}
              </span>
            </div>
          </div>

          {review.title ? <h3 style={{ fontSize: '1rem' }}>{review.title}</h3> : null}
          <p style={{ fontSize: '0.94rem' }}>{review.body}</p>

          {review.adminReply ? <p className="alert alert--info">Reply: {review.adminReply}</p> : null}

          <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => act(review.id, { isApproved: !review.isApproved })}>
              {review.isApproved ? 'Unpublish' : 'Approve'}
            </button>
            <input
              className="input"
              style={{ maxWidth: 320 }}
              placeholder="Write a public reply"
              value={reply[review.id] ?? ''}
              onChange={(event) => setReply({ ...reply, [review.id]: event.target.value })}
            />
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={busy || !reply[review.id]}
              onClick={() => act(review.id, { adminReply: reply[review.id], isApproved: true })}
            >
              Reply
            </button>
            <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => act(review.id, { isApproved: false })}>
              Reject
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={busy}
              onClick={async () => {
                await fetch(`/api/admin/reviews/${review.id}`, { method: 'DELETE' })
                router.refresh()
              }}
            >
              Delete
            </button>
          </div>
        </article>
      ))}
      {!reviews.length ? <div className="empty-state">No reviews yet.</div> : null}
    </div>
  )
}
