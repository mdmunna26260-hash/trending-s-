import { CategoryManager } from '@/components/admin/CategoryManager'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { products: { where: { deletedAt: null } } } },
      children: { select: { id: true, name: true } },
    },
  })

  return (
    <>
      <div className="admin__topbar">
        <div>
          <div className="eyebrow">Catalogue</div>
          <h1 className="page-title mt-2">Categories</h1>
        </div>
        <span className="badge">{categories.length} categories</span>
      </div>

      <CategoryManager
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          imagePath: category.imagePath,
          position: category.position,
          isActive: category.isActive,
          _count: { products: category._count.products },
          children: category.children,
        }))}
      />
    </>
  )
}
