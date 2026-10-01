import Link from 'next/link'
import { prisma } from '@/lib/db'
import { formatMoney } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const page = Math.max(1, Number(searchParams.page || 1))
  const perPage = 20

  const where: any = { deletedAt: null }
  if (searchParams.q) {
    where.OR = [
      { name: { contains: searchParams.q, mode: 'insensitive' } },
      { brand: { contains: searchParams.q, mode: 'insensitive' } },
      { sku: { contains: searchParams.q, mode: 'insensitive' } },
    ]
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        images: { orderBy: { position: 'asc' }, take: 1 },
        variants: { select: { stock: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.product.count({ where }),
  ])

  return (
    <>
      <div className="admin__topbar">
        <div>
          <div className="eyebrow">Catalogue</div>
          <h1 className="page-title mt-2">Products</h1>
        </div>
        <Link href="/admin/products/new" className="btn btn--sm">
          Add product
        </Link>
      </div>

      <form className="surface pad row" style={{ gap: '0.75rem' }}>
        <input
          name="q"
          className="input"
          placeholder="Search name, brand or SKU"
          defaultValue={searchParams.q || ''}
          style={{ maxWidth: 320 }}
        />
        <button type="submit" className="btn btn--sm">
          Search
        </button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Position</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const stock = product.variants.reduce((sum, variant) => sum + variant.stock, 0)
              return (
                <tr key={product.id}>
                  <td>
                    <Link href={`/admin/products/${product.id}`} className="row gap-2">
                      {product.images[0] ? (
                        <img
                          src={product.images[0].path}
                          alt=""
                          width={36}
                          height={45}
                          loading="lazy"
                          style={{ objectFit: 'cover', borderRadius: 2 }}
                        />
                      ) : null}
                      <span>
                        {product.name}
                        <div className="small muted">{product.brand || '—'}</div>
                      </span>
                    </Link>
                  </td>
                  <td>{product.category.name}</td>
                  <td>
                    {formatMoney(product.price)}
                    {product.compareAtPrice ? <div className="small muted strike">{formatMoney(product.compareAtPrice)}</div> : null}
                  </td>
                  <td>
                    <span className={`badge ${stock === 0 ? 'badge--danger' : stock <= 5 ? 'badge--warn' : 'badge--ok'}`}>
                      {stock}
                    </span>
                  </td>
                  <td>{product.position}</td>
                  <td>
                    {product.isActive ? (
                      <span className="badge badge--ok">active</span>
                    ) : (
                      <span className="badge">hidden</span>
                    )}
                    {product.isFeatured ? <span className="badge badge--info" style={{ marginLeft: 4 }}>featured</span> : null}
                  </td>
                  <td>
                    <Link href={`/admin/products/${product.id}`} className="link-underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              )
            })}
            {!products.length ? (
              <tr>
                <td colSpan={7} className="center muted">
                  No products found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="small muted">{total} products</p>
    </>
  )
}
