import Script from 'next/script'
import type { StoreSettings } from '@/lib/queries'

/**
 * Loads Meta Pixel, GA4 and GTM only when the corresponding IDs are configured
 * in settings/env. All IDs come from the database (admin → settings) with the
 * environment variable as fallback, never hardcoded.
 */
export function TrackingScripts({ settings }: { settings: StoreSettings }) {
  const pixelId = settings.metaPixelId || process.env.NEXT_PUBLIC_META_PIXEL_ID || ''
  const ga4Id = settings.ga4MeasurementId || process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || ''
  const gtmId = settings.gtmId || process.env.NEXT_PUBLIC_GTM_ID || ''

  return (
    <>
      {pixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {ga4Id && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${ga4Id}');
            `}
          </Script>
        </>
      )}

      {gtmId && (
        <Script id="gtm" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','${gtmId}');
          `}
        </Script>
      )}
    </>
  )
}
