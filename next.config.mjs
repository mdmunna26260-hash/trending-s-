/** @type {import('next').NextConfig} */

/**
 * Extra origins the dev server may serve `/_next/*` assets to.
 *
 * Needed when the storefront is previewed through a proxy domain (Arena's
 * `*.e2b.app` preview, a staging tunnel, …) instead of plain localhost — the
 * browser then sends a cross-origin Origin and Next.js would otherwise log a
 * warning. Comma-separated; subdomain wildcards are allowed.
 */
const devOrigins = (process.env.NEXT_DEV_ORIGINS || '*.e2b.app,localhost,127.0.0.1')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const nextConfig = {
  reactStrictMode: true,
  ...(devOrigins.length ? { allowedDevOrigins: devOrigins } : {}),
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  images: {
    formats: ['image/webp'],
    deviceSizes: [320, 420, 640, 828, 1080, 1200, 1600, 1920, 2560],
    imageSizes: [64, 96, 128, 256, 384, 512],
    minimumCacheTTL: 31536000,
    remotePatterns: [],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  experimental: {
    optimizePackageImports: [],
  },
}

export default nextConfig
