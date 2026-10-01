import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init)
}

export function fail(status: number, message: string, details?: unknown) {
  return NextResponse.json({ success: false, error: message, details }, { status })
}

export function handleError(error: unknown) {
  if (error instanceof ApiError) {
    return fail(error.status, error.message, error.details)
  }
  if (error instanceof ZodError) {
    return fail(422, 'Validation failed', error.flatten().fieldErrors)
  }
  console.error('[api]', error)
  return fail(500, 'Something went wrong. Please try again.')
}

export function requestMeta(source: Request | Headers) {
  const headers = source instanceof Headers ? source : source.headers
  const forwarded = headers.get('x-forwarded-for') || ''
  const ip = (forwarded.split(',')[0] || headers.get('x-real-ip') || '127.0.0.1').trim()
  return {
    ip,
    userAgent: headers.get('user-agent') || 'unknown',
  }
}

export function normalizePhone(input: string): string {
  const digits = input.replace(/[^\d+]/g, '')
  const cleaned = digits.replace(/^\+?880/, '0').replace(/^880/, '0')
  if (/^01[3-9]\d{8}$/.test(cleaned)) return cleaned
  if (/^1[3-9]\d{8}$/.test(cleaned)) return `0${cleaned}`
  return cleaned
}

export function isValidBdPhone(input: string): boolean {
  return /^01[3-9]\d{8}$/.test(normalizePhone(input))
}

/** Escape user supplied values before they are placed in HTML emails. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
