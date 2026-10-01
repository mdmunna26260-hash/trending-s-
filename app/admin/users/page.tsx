import { prisma } from '@/lib/db'
import { UserManager } from '@/components/admin/UserForm'
import { getAdmin, permissionsFor } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const [admins, current] = await Promise.all([
    prisma.admin.findMany({ orderBy: { createdAt: 'asc' } }),
    getAdmin(),
  ])

  return (
    <>
      <div className="admin__topbar">
        <div>
          <div className="eyebrow">Operations</div>
          <h1 className="page-title mt-2">Admin users</h1>
        </div>
        {current ? <span className="badge">Your role: {current.role.toLowerCase()}</span> : null}
      </div>

      {current?.role === 'OWNER' ? (
        <UserManager
          admins={admins.map((admin) => ({
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            isActive: admin.isActive,
            lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
          }))}
        />
      ) : (
        <div className="surface pad">
          <p className="alert alert--warn">Only the owner can create or change admin users.</p>
          <table className="table table--compact mt-4">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td>{admin.name}</td>
                  <td className="small">{admin.email}</td>
                  <td>{admin.role.toLowerCase()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="surface pad">
        <h2 className="label" style={{ marginBottom: '0.75rem' }}>
          Role permissions
        </h2>
        <div className="stack" style={{ gap: '0.75rem' }}>
          {(['OWNER', 'MANAGER', 'STAFF'] as const).map((role) => (
            <div key={role}>
              <strong>{role.toLowerCase()}</strong>
              <div className="small muted">{permissionsFor(role).join(', ')}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
