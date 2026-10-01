'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Stars } from './Stars'
import { formatDate } from '@/lib/utils'

interface Review {
  id: string
  rating: number
  title: string | null
  body: string
  reviewerName: string
  isVerifiedPurchase: boolean
  adminReply: string | null
  createdAt: string
}

export function ReviewSection({
  productId,
  productName,
  reviews,
  isLoggedIn,
}: {
  productId: string
  productName: string
  reviews: Review[]
  isLoggedIn: boolean
}) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((review) => review.rating === star).length,
  }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, rating, title, body }),
      })
      const payload = await response.json()
      if (payload.success) {
        setStatus(payload.data.message)
        setTitle('')
        setBody('')
      } else {
        setStatus(payload.error)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="section" id="review">
      <div className="toolbar mb-5">
        <div>
          <div className="eyebrow">Reviews</div>
          <h2 className="display-2 mt-2">
            {reviews.length} review{reviews.length === 1 ? '' : 's'} for {productName}
          </h2>
        </div>
        {isLoggedIn ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen((value) => !value)}>
            {open ? 'Cancel' : 'Write a review'}
          </button>
        ) : (
          <Link href="/account" className="btn btn--ghost btn--sm">
            Log in to review
          </Link>
        )}
      </div>

      {reviews.length ? (
        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '2rem' }}>
          <div className="row gap-4" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div className="center">
              <div className="display" style={{ fontSize: '3rem', lineHeight: 1 }}>
                {average.toFixed(1)}
              </div>
              <Stars value={average} size={16} />
              <div className="small muted mt-2">{reviews.length} reviews</div>
            </div>
            <div className="grow" style={{ minWidth: 220, maxWidth: 360 }}>
              {distribution.map((row) => (
                <div key={row.star} className="row gap-2" style={{ fontSize: '0.8rem' }}>
                  <span style={{ width: 34 }}>{row.star}★</span>
                  <div style={{ flex: 1, height: 6, background: 'var(--stone-200)', borderRadius: 3 }}>
                    <div
                      style={{
                        width: `${reviews.length ? (row.count / reviews.length) * 100 : 0}%`,
                        height: '100%',
                        background: 'var(--brass-500)',
                        borderRadius: 3,
                      }}
                    />
                  </div>
                  <span className="muted" style={{ width: 20, textAlign: 'right' }}>
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            {reviews.map((review) => (
              <article key={review.id} className="review">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <Stars value={review.rating} size={14} />
                  <span className="small muted">{formatDate(review.createdAt)}</span>
                </div>
                {review.title ? <h3 className="mt-2" style={{ fontSize: '1rem' }}>{review.title}</h3> : null}
                <p className="mt-2" style={{ fontSize: '0.94rem', lineHeight: 1.7 }}>
                  {review.body}
                </p>
                <div className="row gap-2 mt-3">
                  <span className="small muted">{review.reviewerName}</span>
                  {review.isVerifiedPurchase ? <span className="badge badge--ok">Verified purchase</span> : null}
                </div>
                {review.adminReply ? (
                  <div className="alert alert--info mt-3">
                    <strong>Store reply:</strong> {review.adminReply}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state">No reviews yet — be the first to share your thoughts.</div>
      )}

      {open && isLoggedIn ? (
        <form className="surface pad mt-5 stack" onSubmit={submit} style={{ gap: '1rem', maxWidth: 620 }}>
          <div className="field">
            <span className="label">Your rating</span>
            <div className="chip-row">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className="chip"
                  aria-pressed={rating === value}
                  onClick={() => setRating(value)}
                  aria-label={`${value} star${value > 1 ? 's' : ''}`}
                >
                  {value}★
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="review-title">Title</label>
            <input
              id="review-title"
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Sums it up in a few words"
            />
          </div>
          <div className="field">
            <label htmlFor="review-body">Your review</label>
            <textarea
              id="review-body"
              className="textarea"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              required
              minLength={10}
              placeholder="How was the fit, the fabric, the delivery?"
            />
          </div>
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit review'}
          </button>
          {status ? <p className="alert alert--info">{status}</p> : null}
        </form>
      ) : null}
    </section>
  )
}
