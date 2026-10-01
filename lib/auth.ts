import { cookies, headers } from 'next/headers'
import type { Admin, AdminRole, Customer } from '@prisma/client'
import { prisma } from './db'
import { env } from './env'
import { hashPassword, randomToken, sha256, signToken, verifyPassword, verifyToken } from './crypto'
import { ApiError, isValidBdPhone, normalizePhone, requestMeta } from './http'

export const ADMIN_COOKIE = 'rv_admin_session'
export const CUSTOMER_COOKIE = 'rv_customer_session'
export const CART_COOKIE = 'rv_cart_token'

const SESSION_DAYS = 30

export const PERMISSIONS = [
  'dashboard.view',
  'orders.view',
  'orders.manage',
  'products.view',
  'products.manage',
  'categories.manage',
  'customers.view',
  'customers.manage',
  'inventory.manage',
  'coupons.manage',
  'reviews.manage',
  'marketing.view',
  'courier.manage',
  'fraud.manage',
  'settings.manage',
] as const

export type Permission = (typeof PERMISSIONS)[number]

const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  OWNER: [...PERMISSIONS],
  MANAGER: [
    'dashboard.view',
    'orders.view',
    'orders.manage',
    'products.view',
    'products.manage',
    'categories.manage',
    'customers.view',
    'customers.manage',
    'inventory.manage',
    'coupons.manage',
    'reviews.manage',
    'marketing.view',
    'courier.manage',
    'fraud.manage',
  ],
  STAFF: ['dashboard.view', 'orders.view', 'orders.manage', 'inventory.manage', 'reviews.manage'],
}

export function can(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

export function permissionsFor(role: AdminRole): Permission[] {
  return ROLE_PERMISSIONS[role]
}

// ---------------------------------------------------------------------------
// Password policy
// ---------------------------------------------------------------------------

export function assertStrongPassword(password: string) {
  if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters long')
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password))
    throw new ApiError(400, 'Password must contain both uppercase and lowercase letters')
  if (!/\d/.test(password)) throw new ApiError(400, 'Password must contain at least one number')
}

// ---------------------------------------------------------------------------
// Admin authentication
// ---------------------------------------------------------------------------

export async function loginAdmin(email: string, password: string) {
  const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (!admin || !admin.isActive) {
    // Identical response shape prevents account enumeration.
    throw new ApiError(401, 'Invalid email or password')
  }
  const valid = await verifyPassword(password, admin.passwordHash)
  if (!valid) {
    await prisma.auditLog.create({
      data: { actorType: 'ADMIN', actorId: admin.id, action: 'admin.login_failed', entity: 'Admin' },
    })
    throw new ApiError(401, 'Invalid email or password')
  }

  const token = randomToken()
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await prisma.adminSession.create({
    data: { adminId: admin.id, tokenHash: sha256(token), expiresAt },
  })
  await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } })
  await prisma.auditLog.create({
    data: { actorType: 'ADMIN', actorId: admin.id, action: 'admin.login', entity: 'Admin' },
  })
  return { token, expiresAt, admin }
}

export async function getAdmin(): Promise<Admin | null> {
  const store = cookies()
  const token = store.get(ADMIN_COOKIE)?.value
  if (!token) return null
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { admin: true },
  })
  if (!session || session.expiresAt < new Date()) return null
  if (!session.admin.isActive) return null
  return session.admin
}

export async function requireAdmin(permission?: Permission): Promise<Admin> {
  const admin = await getAdmin()
  if (!admin) throw new ApiError(401, 'Admin authentication required')
  if (permission && !can(admin.role, permission))
    throw new ApiError(403, 'You do not have permission to perform this action')
  return admin
}

export async function logoutAdmin() {
  const store = cookies()
  const token = store.get(ADMIN_COOKIE)?.value
  if (token) await prisma.adminSession.deleteMany({ where: { tokenHash: sha256(token) } })
  store.delete(ADMIN_COOKIE)
}

// ---------------------------------------------------------------------------
// Customer authentication (phone + password)
// ---------------------------------------------------------------------------

export async function registerCustomer(input: { phone: string; name: string; password: string }) {
  const phone = normalizePhone(input.phone)
  if (!isValidBdPhone(phone)) throw new ApiError(400, 'Enter a valid Bangladeshi phone number')
  assertStrongPassword(input.password)

  const existing = await prisma.customer.findUnique({ where: { phone } })
  if (existing) throw new ApiError(409, 'An account already exists for this phone number')

  const customer = await prisma.customer.create({
    data: { phone, name: input.name.trim(), passwordHash: await hashPassword(input.password) },
  })
  return customer
}

export async function loginCustomer(phoneInput: string, password: string) {
  const phone = normalizePhone(phoneInput)
  if (!isValidBdPhone(phone)) throw new ApiError(400, 'Enter a valid Bangladeshi phone number')

  const ip = requestMeta(await headers()).ip
  const customer = await prisma.customer.findUnique({ where: { phone } })

  if (!customer) {
    // Same error message for unknown phone and wrong password.
    await recordLoginAttemptSafe(phone, ip, false, 'unknown_phone')
    throw new ApiError(401, 'Invalid phone number or password')
  }
  if (customer.isBlocked) {
    await recordLoginAttemptSafe(phone, ip, false, 'blocked')
    throw new ApiError(403, 'This account has been suspended. Please contact support.')
  }

  const valid = customer.passwordHash ? await verifyPassword(password, customer.passwordHash) : false
  if (!valid) {
    await recordLoginAttemptSafe(phone, ip, false, 'bad_password')
    const failures = await countFailures(phone)
    if (failures >= 8) throw new ApiError(429, 'Too many failed attempts. Try again in 15 minutes.')
    throw new ApiError(401, 'Invalid phone number or password')
  }

  await recordLoginAttemptSafe(phone, ip, true)
  const token = randomToken()
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await prisma.customerSession.create({ data: { customerId: customer.id, tokenHash: sha256(token), expiresAt, ip } })
  return { token, expiresAt, customer }
}

async function recordLoginAttemptSafe(phone: string, ip: string, success: boolean, reason?: string) {
  const { recordLoginAttempt } = await import('./ratelimit')
  await recordLoginAttempt(phone, ip, success, reason)
}

async function countFailures(phone: string) {
  const { countRecentFailures } = await import('./ratelimit')
  return countRecentFailures(phone)
}

export async function getCustomer(): Promise<Customer | null> {
  const store = cookies()
  const token = store.get(CUSTOMER_COOKIE)?.value
  if (!token) return null
  const session = await prisma.customerSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { customer: true },
  })
  if (!session || session.expiresAt < new Date()) return null
  if (session.customer.isBlocked) return null
  return session.customer
}

export async function logoutCustomer() {
  const store = cookies()
  const token = store.get(CUSTOMER_COOKIE)?.value
  if (token) await prisma.customerSession.deleteMany({ where: { tokenHash: sha256(token) } })
  store.delete(CUSTOMER_COOKIE)
}

// ---------------------------------------------------------------------------
// Signed customer-facing links (order tracking without logging in)
// ---------------------------------------------------------------------------

export function signOrderLink(orderNumber: string, phone: string, expiresInDays = 90) {
  return signToken({ orderNumber, phone }, env.AUTH_SECRET, expiresInDays * 24 * 60 * 60)
}

export function verifyOrderLink(token: string): { orderNumber: string; phone: string } | null {
  return verifyToken<{ orderNumber: string; phone: string }>(token, env.AUTH_SECRET)
}

// ---------------------------------------------------------------------------
// Bootstrap helper used by the seed script
// ---------------------------------------------------------------------------

export async function ensureAdmin(email: string, password: string, name: string) {
  const existing = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) return existing
  return prisma.admin.create({
    data: { email: email.toLowerCase(), passwordHash: await hashPassword(password), name, role: 'OWNER' },
  })
}
