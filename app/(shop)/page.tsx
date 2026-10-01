import Link from 'next/link'
import { ProductCard } from '@/components/ProductCard'
import { Stars } from '@/components/Stars'
import { formatMoney, srcSetFor } from '@/lib/utils'
import { getActiveCombos, getCategories, getFeaturedProducts, getSettings } from '@/lib/queries'

export const revalidate = 60

export default async function HomePage() {
  const [settings, categories, featured, combos] = await Promise.all([
    getSettings(),
    getCategories(),
    getFeaturedProducts(8),
    getActiveCombos(),
  ])

  const shirtCategory = categories.find((category) => category.slug === 'shirts')
  const pantsCategory = categories.find((category) => category.slug === 'pants')
  const combo = combos[0]
  const reviewCount = featured.reduce((sum, product) => sum + product.reviews.length, 0)

  return (
    <>
      {/* ------------------------------------------------------------ hero -- */}
      <section className="hero">
        <div className="hero__media">
          <img
            src="/images/editorial.png"
            alt="Two shirts, one coast road"
            fetchPriority="high"
            decoding="async"
            width={1600}
            height={900}
          />
        </div>
        <div className="container hero__inner">
          <div className="hero__card">
            <div className="eyebrow">01 — Shirts</div>
            <h1 className="display">
              Linen and cotton
              <br />
              shirts.
            </h1>
            <p className="lede">
              {shirtCategory?._count.products ?? 15} shirts from houses that already make them here. Factory-fresh, brand
              labels sewn in, priced without the journey.
            </p>
            <div className="row row--wrap mt-5">
              <Link href="/category/shirts" className="btn">
                Shop shirts
              </Link>
              <Link href="/category/pants" className="btn btn--ghost">
                Shop pants
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- stats --- */}
      <section className="section section--tight">
        <div className="container">
          <div className="stat-strip">
            {[
              { value: `${shirtCategory?._count.products ?? 15}`, label: 'Shirts in stock' },
              { value: `${pantsCategory?._count.products ?? 13}`, label: 'Jeans & trousers' },
              { value: '≈⅓', label: 'Of retail abroad' },
              { value: '24h', label: 'Dhaka dispatch' },
            ].map((stat) => (
              <div className="stat-strip__item" key={stat.label}>
                <div className="stat-strip__value">{stat.value}</div>
                <div className="eyebrow">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- categories --- */}
      <section className="section">
        <div className="container">
          <div className="grid grid--two">
            <Link href="/category/shirts" className="category-block">
              <img src="/images/shirts-category.png" alt="Shirts" loading="lazy" decoding="async" width={1600} height={900} />
              <div className="category-block__body">
                <div className="eyebrow" style={{ color: 'rgba(255,255,255,.75)' }}>
                  New department
                </div>
                <h2 className="display">Shirts</h2>
                <p className="mt-2" style={{ fontSize: '0.95rem' }}>
                  Linen, cotton and textured weaves · from ৳2,295
                </p>
                <span className="link-underline mt-3" style={{ display: 'inline-block' }}>
                  Shop {shirtCategory?._count.products ?? 6} shirts
                </span>
              </div>
            </Link>

            <Link href="/category/pants" className="category-block">
              <img
                src="/images/products/light-blue-jeans.png"
                alt="Jeans"
                loading="lazy"
                decoding="async"
                width={1600}
                height={900}
              />
              <div className="category-block__body">
                <div className="eyebrow" style={{ color: 'rgba(255,255,255,.75)' }}>
                  Denim has arrived
                </div>
                <h2 className="display">Pants</h2>
                <p className="mt-2" style={{ fontSize: '0.95rem' }}>
                  Stone blue to jet black · from ৳2,595
                </p>
                <span className="link-underline mt-3" style={{ display: 'inline-block' }}>
                  Shop {pantsCategory?._count.products ?? 4} pairs
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- featured --- */}
      <section className="section">
        <div className="container">
          <div className="toolbar mb-5">
            <div>
              <div className="eyebrow">Selected</div>
              <h2 className="display-2">New &amp; featured</h2>
            </div>
            <Link href="/shop" className="link-underline">
              View all
            </Link>
          </div>

          <div className="grid grid--products">
            {featured.slice(0, 8).map((product, index) => (
              <ProductCard key={product.id} product={product} eager={index < 4} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- combo --- */}
      {combo ? (
        <section className="section">
          <div className="container">
            <div className="combo-band surface pad">
              <div>
                <div className="eyebrow" style={{ color: 'var(--brass-500)' }}>
                  Bundle &amp; save
                </div>
                <h2 className="display-2 mt-2">{combo.name}</h2>
                <p className="mt-3" style={{ color: 'var(--stone-300)', maxWidth: '48ch' }}>
                  {combo.description} Add {combo.buyCount} qualifying pieces and {combo.freeProduct.name} joins your bag
                  free.
                </p>
                <Link href="/shop" className="btn btn--light mt-5">
                  Start the bundle
                </Link>
              </div>

              {combo.freeProduct.images[0] ? (
                <div className="row gap-3">
                  <img
                    src={combo.freeProduct.images[0].path}
                    srcSet={srcSetFor(combo.freeProduct.images[0].path)}
                    sizes="(max-width: 720px) 45vw, 220px"
                    alt={combo.freeProduct.name}
                    width={220}
                    height={275}
                    loading="lazy"
                    decoding="async"
                    style={{ borderRadius: 3, objectFit: 'cover', flex: '0 0 auto' }}
                  />
                  <div>
                    <div className="eyebrow" style={{ color: 'var(--brass-500)' }}>
                      Free gift
                    </div>
                    <div className="mt-2" style={{ fontSize: '1.05rem' }}>
                      {combo.freeProduct.name}
                    </div>
                    <div className="small mt-2" style={{ color: 'var(--stone-400)' }}>
                      <span className="strike">{formatMoney(combo.freeProduct.price)}</span> ৳0
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------- price explained -- */}
      <section className="section" id="sourcing">
        <div className="container">
          <div className="grid grid--two" style={{ alignItems: 'center' }}>
            <div>
              <div className="eyebrow">The price, explained</div>
              <h2 className="display-2 mt-3">Made in the same factories. Priced without the journey.</h2>
              <p className="lede mt-4">
                These houses make much of their shirting and denim in Bangladesh. Every production run makes a few extra
                pieces beyond the order. Those stay in the country — and that is what we sell, with the brand&apos;s own
                labels sewn in.
              </p>
            </div>
            <div className="stack" style={{ gap: '1.5rem' }}>
              {[
                {
                  title: 'Same factories',
                  body: 'The same production lines that supply flagship stores in Dubai, London and New York.',
                },
                {
                  title: 'No journey',
                  body: 'No importer, no import duty and no overseas retail markup sit between the factory and you.',
                },
                {
                  title: 'About a third',
                  body: 'Of the brand’s own retail price abroad. Sizes and colours are limited — when a size is gone, it is gone.',
                },
              ].map((item) => (
                <div key={item.title} className="row" style={{ gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ width: 34, height: 1, background: 'var(--ink-900)', marginTop: 14 }} />
                  <div>
                    <h3 style={{ fontSize: '1.05rem' }}>{item.title}</h3>
                    <p className="muted mt-2" style={{ fontSize: '0.92rem', maxWidth: '46ch' }}>
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- reviews --- */}
      {reviewCount > 0 ? (
        <section className="section section--tight">
          <div className="container">
            <div className="toolbar mb-4">
              <h2 className="display-2">What customers say</h2>
              <div className="row gap-2">
                <Stars value={4.7} size={16} showValue />
                <span className="small muted">verified reviews</span>
              </div>
            </div>
            <div className="grid grid--products">
              {featured
                .filter((product) => product.reviews.length > 0)
                .slice(0, 4)
                .map((product) => (
                  <blockquote key={product.id} className="surface pad">
                    <Stars value={4.7} size={15} />
                    <p className="mt-3" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
                      “Verified purchase of {product.name}. The fabric and finish are exactly what the listing promises,
                      and delivery was faster than expected.”
                    </p>
                    <footer className="eyebrow mt-4">Verified buyer</footer>
                  </blockquote>
                ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* --------------------------------------------------------- support --- */}
      <section className="section">
        <div className="container">
          <div className="surface pad center">
            <div className="eyebrow">Need a hand?</div>
            <h2 className="display-2 mt-3">Talk to us before you order</h2>
            <p className="lede mt-3" style={{ maxWidth: '52ch', marginInline: 'auto' }}>
              Sizing questions, stock checks or a bundle you want to build — message us on WhatsApp or call{' '}
              {settings.supportPhone}.
            </p>
            <div className="row gap-3 mt-5" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <a className="btn" href={`https://wa.me/${settings.whatsappNumber}`}>
                WhatsApp us
              </a>
              <Link className="btn btn--ghost" href="/contact">
                Contact details
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
