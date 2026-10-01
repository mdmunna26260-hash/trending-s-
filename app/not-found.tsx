import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="container section container--narrow center">
      <div className="eyebrow">404</div>
      <h1 className="display-2 mt-3">This page has moved on</h1>
      <p className="lede mt-3">The page you were looking for is not here. The collection is, though.</p>
      <div className="row gap-3 mt-5" style={{ justifyContent: 'center' }}>
        <Link href="/shop" className="btn">
          Shop the collection
        </Link>
        <Link href="/" className="btn btn--ghost">
          Home
        </Link>
      </div>
    </div>
  )
}
