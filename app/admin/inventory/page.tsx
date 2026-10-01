import { InventoryTable } from '@/components/admin/InventoryTable'
import { prisma } from '@/lib/db'
import { getSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export default async function AdminInventoryPage({ searchParams }: { searchParams: { filter?: string } }) {
  const settings = await getSettings()
  const where: any = { isActive: true }

  if (searchParams.filter === 'low') where.stock = { lte: settings.lowStockThreshold, gt: 0 }
  if (searchParams.filter === 'out') where.stock = 0

  const rows = await prisma.productVariant.findMany({
    where,
    orderBy: [{ stock: 'asc' }, { product: { position: 'asc' } }],
    take: 300,
    include: { product: { select: { name: true, slug: true, sku: true } } },
  })

  return (
    <>
      <div className="admin__topbar">
        <div>
          <div className="eyebrow">Catalogue</div>
          <h1 className="page-title mt-2">Inventory</h1>
        </div>
        <div className="row gap-2">
          <a className={`btn btn--sm ${!searchParams.filter ? '' : 'btn--ghost'}`} href="/admin/inventory">
            All
          </a>
          <a className={`btn btn--sm ${searchParams.filter === 'low' ? '' : 'btn--ghost'}`} href="/admin/inventory?filter=low">
            Low stock
          </a>
          <a className={`btn btn--sm ${searchParams.filter === 'out' ? '' : 'btn--ghost'}`} href="/admin/inventory?filter=out">
            Out of stock
          </a>
        </div>
      </div>

      <InventoryTable threshold={settings.lowStockThreshold} rows={rows} />
    </>
  )
}
