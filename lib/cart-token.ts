/**
 * Cart identity that survives blocked cookies.
 *
 * A guest cart is normally tracked with the `rv_cart_token` cookie. That
 * breaks when the storefront is loaded in a cross-site context — an embedded
 * preview iframe, Safari ITP, or a strict privacy mode — because the browser
 * simply refuses to store a `SameSite=Lax` cookie from a third party. The cart
 * then silently resets on every request and "add to cart" appears to do
 * nothing.
 *
 * To make that impossible the browser also keeps the token in localStorage and
 * echoes it back on every cart request in the `x-cart-token` header. The server
 * prefers that header, falls back to the cookie, and only generates a new token
 * when neither is present. The cookie is still written so server-rendered pages
 * (checkout, order placement) can resolve the same cart.
 *
 * This module holds constants and browser-guarded helpers only, so it is safe
 * to import from both client components and server code.
 */

/** Request header carrying the browser's cart token. */
export const CART_TOKEN_HEADER = 'x-cart-token'

/** localStorage key holding the same token. */
export const CART_TOKEN_STORAGE_KEY = 'rv_cart_token'

/** Reads the stored token, or `null` when there is nothing stored yet. */
export function readCartToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(CART_TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

/** Persists the token the server resolved for this browser. */
export function rememberCartToken(token?: string | null): void {
  if (!token || typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CART_TOKEN_STORAGE_KEY, token)
  } catch {
    /* storage unavailable — the cookie path still applies */
  }
}

/**
 * Headers for a cart-touching request. Only sends `x-cart-token` once a token
 * has actually been stored, so a first-time visitor keeps whatever cart the
 * cookie already identifies instead of orphaning it.
 */
export function cartHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = readCartToken()
  return token ? { ...extra, [CART_TOKEN_HEADER]: token } : extra
}
