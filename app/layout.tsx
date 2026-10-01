import type { Metadata, Viewport } from 'next'
import './globals.css'
import { getSettings } from '@/lib/settings'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f2efe9',
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
    title: {
      default: `${settings.storeName} — ${settings.tagline}`,
      template: `%s · ${settings.storeName}`,
    },
    description: settings.tagline,
    openGraph: {
      type: 'website',
      siteName: settings.storeName,
      title: settings.storeName,
      description: settings.tagline,
    },
    robots: { index: true, follow: true },
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:wght@400;500&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
