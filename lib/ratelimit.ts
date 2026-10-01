import { prisma } from './db'

const WINDOWS = {
  second: 1000,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
} as const

export type WindowName = keyof typeof WINDOWS

/**
 * Database-backed fixed window rate limiter. Works across serverless/VPS
 * instances because the state lives in Postgres rather than process memory.
 */
export async function rateLimit(
  bucket: string,
  limit: number,
  window: WindowName = 'minute',
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const now = new Date()
  const windowEnd = new Date(Math.ceil(now.getTime() / WINDOWS[window]) * WINDOWS[window])
  const key = `${window}:${bucket}`

  const entry = await prisma.rateLimitEntry.upsert({
    where: { bucket_windowEnd: { bucket: key, windowEnd } },
    create: { bucket: key, windowEnd, hits: 1 },
    update: { hits: { increment: 1 } },
  })

  // Opportunistic cleanup of expired windows keeps the table small.
  if (Math.random() < 0.02) {
    await prisma.rateLimitEntry.deleteMany({ where: { windowEnd: { lt: now } } }).catch(() => {})
  }

  return {
    allowed: entry.hits <= limit,
    remaining: Math.max(0, limit - entry.hits),
    resetAt: entry.windowEnd,
  }
}

/** Account lockout: counts failed logins for a phone number inside a window. */
export async function recordLoginAttempt(phone: string, ip: string, success: boolean, reason?: string) {
  await prisma.loginAttempt.create({ data: { phone, ip, success, reason } })
}

export async function countRecentFailures(phone: string, windowMs = 15 * 60 * 1000) {
  const since = new Date(Date.now() - windowMs)
  return prisma.loginAttempt.count({ where: { phone, success: false, createdAt: { gte: since } } })
}

export async function isLockedOut(phone: string, maxFailures = 8, windowMs = 15 * 60 * 1000) {
  return (await countRecentFailures(phone, windowMs)) >= maxFailures
}

/** Order velocity protection: how many orders a phone/IP created recently. */
export async function registerOrderVelocity(phone: string, ip: string) {
  const windowMs = 60 * 60 * 1000
  const windowEnd = new Date(Math.ceil(Date.now() / windowMs) * windowMs)
  const entry = await prisma.orderVelocity.upsert({
    where: { phone_ip_windowEnd: { phone, ip, windowEnd } },
    create: { phone, ip, windowEnd, count: 1 },
    update: { count: { increment: 1 } },
  })
  return entry.count
}

export async function orderVelocityCount(phone: string, ip: string) {
  const windowEnd = new Date(Math.ceil(Date.now() / (60 * 60 * 1000)) * (60 * 60 * 1000))
  const entry = await prisma.orderVelocity.findUnique({
    where: { phone_ip_windowEnd: { phone, ip, windowEnd } },
  })
  return entry?.count ?? 0
}
