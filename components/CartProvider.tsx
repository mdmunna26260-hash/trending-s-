'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { CartView } from '@/lib/cart'

interface CartContextValue {
  cart: CartView | null
  loading: boolean
  refresh: () => Promise<void>
  addItem: (input: { productId: string; variantId?: string | null; quantity?: number }) => Promise<{ ok: boolean; message?: string }>
  updateItem: (itemId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  applyCoupon: (code: string | null) => Promise<{ ok: boolean; message?: string }>
}

const CartContext = createContext<CartContextValue | null>(null)

const EVENT = 'cart:updated'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartView | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/cart', { cache: 'no-store' })
      const payload = await response.json()
      if (payload.success) setCart(payload.data)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const handler = () => refresh()
    window.addEventListener(EVENT, handler)
    return () => window.removeEventListener(EVENT, handler)
  }, [refresh])

  const addItem = useCallback<CartContextValue['addItem']>(
    async (input) => {
      try {
        const response = await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
        const payload = await response.json()
        if (payload.success) {
          setCart(payload.data)
          window.dispatchEvent(new Event(EVENT))
          return { ok: true }
        }
        return { ok: false, message: payload.error }
      } catch {
        return { ok: false, message: 'Could not reach the server' }
      }
    },
    [],
  )

  const updateItem = useCallback<CartContextValue['updateItem']>(async (itemId, quantity) => {
    const response = await fetch(`/api/cart/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    })
    const payload = await response.json()
    if (payload.success) {
      setCart(payload.data)
      window.dispatchEvent(new Event(EVENT))
    }
  }, [])

  const removeItem = useCallback<CartContextValue['removeItem']>(async (itemId) => {
    const response = await fetch(`/api/cart/items/${itemId}`, { method: 'DELETE' })
    const payload = await response.json()
    if (payload.success) {
      setCart(payload.data)
      window.dispatchEvent(new Event(EVENT))
    }
  }, [])

  const applyCoupon = useCallback<CartContextValue['applyCoupon']>(async (code) => {
    const response = await fetch('/api/cart/coupon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const payload = await response.json()
    if (payload.success) {
      setCart(payload.data)
      window.dispatchEvent(new Event(EVENT))
      return { ok: true }
    }
    return { ok: false, message: payload.error }
  }, [])

  return (
    <CartContext.Provider value={{ cart, loading, refresh, addItem, updateItem, removeItem, applyCoupon }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used inside CartProvider')
  return context
}
