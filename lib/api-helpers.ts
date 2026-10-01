import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { ApiError } from './http'
import { rateLimit, type WindowName } from './ratelimit'

export function handleError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ success: false, error: error.message, details: error.details }, { status: error.status })
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ success: false, error: 'Validation failed', details: error.flatten().fieldErrors }, { status: 422 })
  }
  console.error('[api]', error)
  return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
}

/** Thin wrapper so route handlers can fail fast with a 429 response. */
export async function rateLimitSafe(bucket: string, limit: number, window: WindowName = 'minute') {
  return rateLimit(bucket, limit, window)
}
