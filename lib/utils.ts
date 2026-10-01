export function formatMoney(poisha: number): string {
  const amount = poisha / 100
  return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9ऀ-ॿ]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

export function truncate(value: string, length = 120): string {
  return value.length > length ? `${value.slice(0, length).trimEnd()}…` : value
}

export function averageRating(values: number[]): number {
  if (!values.length) return 0
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}

export function discountPercent(price: number, compareAt?: number | null): number | null {
  if (!compareAt || compareAt <= price) return null
  return Math.round(((compareAt - price) / compareAt) * 100)
}

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']

export function toBengaliNumber(value: number | string): string {
  return String(value).replace(/\d/g, (d) => BENGALI_DIGITS[Number(d)])
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

const RESPONSIVE_WIDTHS = [400, 800, 1200, 1600]

/**
 * Builds a srcset string for an uploaded WebP family.
 *
 * The stored path encodes the largest derivative that was actually written
 * (e.g. `…-1200.webp`), so only widths that exist are advertised — never a
 * size the image pipeline skipped, which would 404.
 */
export function srcSetFor(imagePath: string): string {
  const match = /^(.*)-(\d+)\.webp$/.exec(imagePath)
  if (!match) return imagePath
  const [, base, largest] = match
  const largestWidth = Number(largest)
  if (!Number.isFinite(largestWidth) || largestWidth <= 0) return imagePath
  const widths = RESPONSIVE_WIDTHS.filter((width) => width <= largestWidth)
  // Sources smaller than the smallest step still deserve a usable srcset.
  if (!widths.length) widths.push(largestWidth)
  return widths.map((width) => `${base}-${width}.webp ${width}w`).join(', ')
}
