import { prisma } from './db'

export interface StoreSettings {
  storeName: string
  tagline: string
  supportPhone: string
  whatsappNumber: string
  supportEmail: string
  address: string
  currency: string
  announcement: string
  shippingInsideDhaka: number
  shippingOutsideDhaka: number
  freeShippingThreshold: number
  codFeePercent: number
  codFeeFlat: number
  minOrderValue: number
  lowStockThreshold: number
  autoParcelOnConfirm: boolean
  requireReviewApproval: boolean
  orderPrefix: string
  maintenanceMode: boolean
  metaPixelId: string
  ga4MeasurementId: string
  gtmId: string
}

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'RUVIO',
  tagline: 'Factory-fresh menswear, priced without the journey.',
  supportPhone: '+880 1700-000000',
  whatsappNumber: '8801700000000',
  supportEmail: 'support@example.com',
  address: 'Dhaka, Bangladesh',
  currency: 'BDT',
  announcement: 'Free delivery on orders over ৳2,000 · Cash on delivery nationwide',
  shippingInsideDhaka: 6000,
  shippingOutsideDhaka: 12000,
  freeShippingThreshold: 200000,
  codFeePercent: 1,
  codFeeFlat: 0,
  minOrderValue: 0,
  lowStockThreshold: 3,
  autoParcelOnConfirm: true,
  requireReviewApproval: true,
  orderPrefix: 'RV',
  maintenanceMode: false,
  metaPixelId: '',
  ga4MeasurementId: '',
  gtmId: '',
}

const CACHE_TTL = 30_000
let cache: { value: StoreSettings; at: number } | null = null

export async function getSettings(): Promise<StoreSettings> {
  if (cache && Date.now() - cache.at < CACHE_TTL) return cache.value
  const rows = await prisma.setting.findMany()
  const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]))
  const merged = { ...DEFAULT_SETTINGS } as StoreSettings
  for (const [key, value] of Object.entries(stored)) {
    if (key in merged && value !== null && value !== undefined) {
      ;(merged as unknown as Record<string, unknown>)[key] = value
    }
  }
  cache = { value: merged, at: Date.now() }
  return merged
}

export async function updateSettings(patch: Partial<StoreSettings>) {
  const operations = Object.entries(patch).map(([key, value]) =>
    prisma.setting.upsert({
      where: { key },
      create: { key, value: value as never },
      update: { value: value as never },
    }),
  )
  await prisma.$transaction(operations)
  cache = null
  return getSettings()
}

export function invalidateSettingsCache() {
  cache = null
}
