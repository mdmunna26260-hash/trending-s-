import { cookies, headers } from 'next/headers'
import { prisma } from './db'
import { CART_COOKIE } from './auth'
import { CART_TOKEN_HEADER } from './cart-token'
import { randomToken } from './crypto'
import { ApiError } from './http'
import { getSettings, type StoreSettings } from './settings'

const CART_MAX_ITEMS = 50

export interface CartLine {
  id: string
  productId: string
  variantId: string | null
  name: string
  slug: string
  brand: string | null
  variantName: string | null
  colorFamily: string | null
  hexColor: string | null
  imagePath: string | null
  unitPrice: number
  compareAtPrice: number | null
  quantity: number
  lineTotal: number
  isFreeGift: boolean
  stock: number
  maxQuantity: number
}

export interface CartTotals {
  itemCount: number
  paidItemCount: number
  subtotal: number
  discountTotal: number
  shippingTotal: number
  codFee: number
  grandTotal: number
  couponCode: string | null
  freeGifts: number
  appliedCombo: string | null
  freeShipping: boolean
}

export interface CartView {
  token: string
  customerId: string | null
  lines: CartLine[]
  totals: CartTotals
}

function cartCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 60,
  }
}

/**
 * Resolves the cart token for the current request.
 *
 * Order of preference:
 *   1. the `x-cart-token` request header, which the browser sends from
 *      localStorage — this is what keeps guest carts working when the cookie
 *      cannot be stored at all;
 *   2. the `rv_cart_token` cookie;
 *   3. a freshly generated token.
 *
 * The cookie is always rewritten so server-rendered pages (checkout, order
 * placement) resolve the very same cart.
 */
async function resolveToken(): Promise<string> {
  const store = cookies()
  const headerToken = headers().get(CART_TOKEN_HEADER)?.trim()
  const existing = headerToken || store.get(CART_COOKIE)?.value
  if (existing) {
    if (store.get(CART_COOKIE)?.value !== existing) {
      store.set(CART_COOKIE, existing, cartCookieOptions())
    }
    return existing
  }
  const token = randomToken(24)
  store.set(CART_COOKIE, token, cartCookieOptions())
  return token
}

export async function getCartToken(): Promise<string> {
  return resolveToken()
}

export async function getOrCreateCart(customerId?: string | null) {
  const token = await resolveToken()
  const existing = await prisma.cart.findUnique({
    where: { token },
    include: { items: { include: { product: true, variant: true } } },
  })

  if (existing) {
    if (customerId && existing.customerId !== customerId) {
      await prisma.cart.update({ where: { id: existing.id }, data: { customerId } })
    }
    await prisma.cart.update({ where: { id: existing.id }, data: { lastActivityAt: new Date() } })
    return prisma.cart.findUniqueOrThrow({
      where: { token },
      include: { items: { include: { product: true, variant: true } } },
    })
  }

  // A signed-in customer's most recent cart is merged into this token.
  if (customerId) {
    const previous = await prisma.cart.findFirst({
      where: { customerId },
      orderBy: { lastActivityAt: 'desc' },
      include: { items: true },
    })
    if (previous && previous.items.length) {
      await prisma.cart.update({ where: { id: previous.id }, data: { token, lastActivityAt: new Date() } })
      return prisma.cart.findUniqueOrThrow({
        where: { token },
        include: { items: { include: { product: true, variant: true } } },
      })
    }
  }

  return prisma.cart.create({
    data: { token, customerId: customerId ?? undefined },
    include: { items: { include: { product: true, variant: true } } },
  })
}

export async function getCartView(customerId?: string | null): Promise<CartView> {
  const cart = await getOrCreateCart(customerId)
  // Legacy rows without a size cannot be checked out — drop them.
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id, variantId: null, isFreeGift: false } })
  const settings = await getSettings()
  const coupon = cart.couponCode
    ? await prisma.coupon.findUnique({ where: { code: cart.couponCode } })
    : null
  await syncComboGifts(cart.id)
  const fresh = await prisma.cart.findUniqueOrThrow({
    where: { id: cart.id },
    include: {
      items: {
        include: {
          product: { include: { images: { orderBy: { position: 'asc' } } } },
          variant: true,
        },
      },
    },
  })
  return buildCartView(fresh, {
    settings,
    discount: couponDiscount(coupon, subtotalOf(fresh)),
    freeShippingCoupon: coupon?.type === 'FREE_SHIPPING' && Boolean(coupon?.isActive),
  })
}

function subtotalOf(cart: any): number {
  return cart.items
    .filter((item: any) => !item.isFreeGift)
    .reduce((sum: number, item: any) => sum + (item.variant?.priceOverride ?? item.product.price) * item.quantity, 0)
}

function couponDiscount(coupon: any, subtotal: number): number {
  if (!coupon || !coupon.isActive) return 0
  const now = new Date()
  if (coupon.startsAt && coupon.startsAt > now) return 0
  if (coupon.endsAt && coupon.endsAt < now) return 0
  if (coupon.type === 'PERCENT') {
    const raw = Math.round((subtotal * coupon.value) / 100)
    return coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw
  }
  if (coupon.type === 'FIXED') return Math.min(coupon.value, subtotal)
  return 0
}

function buildCartView(
  cart: any,
  options: { settings: StoreSettings; discount: number; freeShippingCoupon?: boolean },
): CartView {
  const settings = options.settings
  const lines: CartLine[] = cart.items.map((item: any) => {
    const price = item.variant?.priceOverride ?? item.product.price
    const stock = item.variant ? item.variant.stock : 0
    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId ?? null,
      name: item.product.name,
      slug: item.product.slug,
      brand: item.product.brand,
      variantName: item.variant?.name ?? null,
      colorFamily: item.variant?.colorFamily ?? null,
      hexColor: item.variant?.hexColor ?? null,
      imagePath: item.product.images?.[0]?.path ?? null,
      unitPrice: price,
      compareAtPrice: item.product.compareAtPrice,
      quantity: item.quantity,
      lineTotal: item.isFreeGift ? 0 : price * item.quantity,
      isFreeGift: item.isFreeGift,
      stock,
      maxQuantity: item.isFreeGift ? item.quantity : Math.max(1, stock),
    }
  })

  const paidLines = lines.filter((line) => !line.isFreeGift)
  const subtotal = paidLines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
  const paidItemCount = paidLines.reduce((sum, line) => sum + line.quantity, 0)

  const discount = options.discount
  const discounted = subtotal - discount
  const freeShipping = options.freeShippingCoupon || discounted >= settings.freeShippingThreshold
  const shippingTotal = paidItemCount === 0 || freeShipping ? 0 : settings.shippingInsideDhaka
  const codFee = paidItemCount === 0 ? 0 : Math.round((discounted * settings.codFeePercent) / 100) + settings.codFeeFlat

  const freeGifts = lines.filter((line) => line.isFreeGift).reduce((sum, line) => sum + line.quantity, 0)

  return {
    token: cart.token,
    customerId: cart.customerId ?? null,
    lines,
    totals: {
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      paidItemCount,
      subtotal,
      discountTotal: discount,
      shippingTotal,
      codFee,
      grandTotal: discounted + shippingTotal + codFee,
      couponCode: cart.couponCode ?? null,
      freeGifts,
      appliedCombo: comboSummary(cart.items),
      freeShipping,
    },
  }
}

function comboSummary(items: any[]): string | null {
  const gifts = items.filter((item) => item.isFreeGift)
  if (!gifts.length) return null
  return `${gifts.length} free gift${gifts.length > 1 ? 's' : ''} applied`
}

export function computeCouponDiscount(code: string | null | undefined, subtotal: number, coupon?: { type: string; value: number; maxDiscount?: number | null } | null): number {
  if (!code) return 0
  if (code === 'FREESHIP') return 0
  if (!coupon) return 0
  if (coupon.type === 'PERCENT') {
    const raw = Math.round((subtotal * coupon.value) / 100)
    return coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw
  }
  if (coupon.type === 'FIXED') return Math.min(coupon.value, subtotal)
  return 0
}

/**
 * Recalculates combo ("buy 2/3 get 1 free") gift rows for a cart so the
 * storefront and checkout always agree on what is free.
 */
export async function syncComboGifts(cartId: string) {
  const combos = await prisma.combo.findMany({
    where: { isActive: true },
    include: { items: true, freeProduct: { include: { variants: { where: { isActive: true }, orderBy: { position: 'asc' } } } } },
  })
  if (!combos.length) {
    await prisma.cartItem.deleteMany({ where: { cartId, isFreeGift: true } })
    return
  }

  const now = new Date()
  const items = await prisma.cartItem.findMany({ where: { cartId, isFreeGift: false } })
  const desired = new Map<string, number>()

  for (const combo of combos) {
    if (combo.startsAt && combo.startsAt > now) continue
    if (combo.endsAt && combo.endsAt < now) continue
    // A "set" is `buyCount` qualifying pieces: two of the same shirt or two
    // different shirts both complete a set, matching "buy 2/3 get 1 free".
    const qualifyingUnits = combo.items.reduce((sum, entry) => {
      const owned = items
        .filter((item) => item.productId === entry.productId)
        .reduce((total, item) => total + item.quantity, 0)
      return sum + owned
    }, 0)
    const sets = Math.floor(qualifyingUnits / Math.max(1, combo.buyCount))
    if (sets > 0) {
      const key = `${combo.freeProductId}`
      desired.set(key, (desired.get(key) ?? 0) + sets * combo.freeQuantity)
    }
  }

  const gifts = await prisma.cartItem.findMany({ where: { cartId, isFreeGift: true } })
  const giftMap = new Map(gifts.map((gift) => [gift.productId, gift]))

  for (const gift of gifts) {
    if (!desired.has(gift.productId)) {
      await prisma.cartItem.delete({ where: { id: gift.id } })
    }
  }

  for (const [productId, quantity] of desired) {
    const existing = giftMap.get(productId)
    if (existing) {
      if (existing.quantity !== quantity) {
        await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity } })
      }
      continue
    }
    const combo = combos.find((entry) => entry.freeProductId === productId)!
    const variant = combo.freeProduct.variants[0] ?? null
    await prisma.cartItem.create({
      data: {
        cartId,
        productId,
        variantId: variant?.id,
        quantity,
        unitPrice: 0,
        isFreeGift: true,
      },
    })
  }
}

export async function addToCart(
  input: {
    productId: string
    variantId?: string | null
    quantity: number
  },
  customerId?: string | null,
) {
  const cart = await getOrCreateCart(customerId)
  const product = await prisma.product.findFirst({
    where: { id: input.productId, isActive: true, deletedAt: null },
    include: { variants: { where: { isActive: true }, orderBy: { position: 'asc' } } },
  })
  if (!product) throw new ApiError(404, 'Product not found')
  if (!product.variants.length) throw new ApiError(400, 'This product is out of stock')

  const variant = input.variantId
    ? product.variants.find((entry) => entry.id === input.variantId)
    : product.variants[0]
  if (!variant) throw new ApiError(400, 'Selected size is unavailable')
  if (variant.stock <= 0) throw new ApiError(400, `${variant.name} is out of stock`)

  const quantity = Math.max(1, Math.min(10, Math.floor(input.quantity || 1)))
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId_variantId: { cartId: cart.id, productId: product.id, variantId: variant.id } },
  })
  const nextQuantity = (existing?.quantity ?? 0) + quantity
  if (nextQuantity > variant.stock) {
    throw new ApiError(400, `Only ${variant.stock} left of ${product.name} — ${variant.name}`)
  }

  await prisma.cartItem.upsert({
    where: { cartId_productId_variantId: { cartId: cart.id, productId: product.id, variantId: variant.id } },
    create: {
      cartId: cart.id,
      productId: product.id,
      variantId: variant.id,
      quantity: nextQuantity,
      unitPrice: variant.priceOverride ?? product.price,
    },
    update: { quantity: nextQuantity, unitPrice: variant.priceOverride ?? product.price },
  })

  await prisma.cart.update({ where: { id: cart.id }, data: { lastActivityAt: new Date() } })
  await syncComboGifts(cart.id)
  return getCartView(customerId)
}

export async function updateCartItem(itemId: string, quantity: number, customerId?: string | null) {
  const cart = await getOrCreateCart(customerId)
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: { variant: true } })
  if (!item) throw new ApiError(404, 'Cart item not found')

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: item.id } })
  } else {
    const max = item.isFreeGift ? quantity : Math.max(1, item.variant?.stock ?? quantity)
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: Math.min(quantity, max) } })
  }
  await syncComboGifts(cart.id)
  return getCartView(customerId)
}

export async function removeCartItem(itemId: string, customerId?: string | null) {
  const cart = await getOrCreateCart(customerId)
  await prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } })
  await syncComboGifts(cart.id)
  return getCartView(customerId)
}

export async function clearCart(customerId?: string | null) {
  const cart = await getOrCreateCart(customerId)
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
  await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } })
}

export async function setCartCoupon(code: string | null, customerId?: string | null) {
  const cart = await getOrCreateCart(customerId)
  if (code) {
    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase().trim() } })
    if (!coupon || !coupon.isActive) throw new ApiError(404, 'Coupon not found')
    const now = new Date()
    if (coupon.startsAt && coupon.startsAt > now) throw new ApiError(400, 'This coupon is not active yet')
    if (coupon.endsAt && coupon.endsAt < now) throw new ApiError(400, 'This coupon has expired')
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
      throw new ApiError(400, 'This coupon has reached its usage limit')
  }
  await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: code?.toUpperCase().trim() || null } })
  return getCartView(customerId)
}

export async function validateCouponForCart(code: string, subtotal: number) {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase().trim() } })
  if (!coupon || !coupon.isActive) throw new ApiError(404, 'Coupon not found')
  const now = new Date()
  if (coupon.startsAt && coupon.startsAt > now) throw new ApiError(400, 'This coupon is not active yet')
  if (coupon.endsAt && coupon.endsAt < now) throw new ApiError(400, 'This coupon has expired')
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
    throw new ApiError(400, 'This coupon has reached its usage limit')
  if (subtotal < coupon.minSubtotal)
    throw new ApiError(400, `Minimum order of ৳${(coupon.minSubtotal / 100).toLocaleString()} required`)
  const discount = computeCouponDiscount(coupon.code, subtotal, coupon)
  return { coupon, discount }
}

export { CART_MAX_ITEMS }
