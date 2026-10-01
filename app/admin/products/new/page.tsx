import Link from 'next/link'
import { ProductForm } from '@/components/admin/ProductForm'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default function NewProductPage() {
  return (
    <>
      <div className="admin__topbar">
        <div>
          <div className="eyebrow">
            <Link href="/admin/products">Products</Link> / new
          </div>
          <h1 className="page-title mt-2">Add product</h1>
        </div>
      </div>
      <ProductFormLazy />
    </>
  )
}

async function ProductFormLazy() {
  const categories = await prisma.category.findMany({ orderBy: { position: 'asc' } })
  return <ProductForm mode="create" categories={categories} />
}
