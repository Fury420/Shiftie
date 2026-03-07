export const dynamic = "force-dynamic"

import { db } from "@/db"
import { user } from "@/db/schema"
import { asc, eq } from "drizzle-orm"
import { requireAdmin } from "@/lib/auth-guard"
import { EmployeesTable } from "@/components/employees/employees-table"

export default async function AdminEmployeesPage() {
  const session = await requireAdmin()
  const orgId = (session.user as { organizationId?: string | null }).organizationId!

  const employees = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      color: user.color,
      hourlyRate: user.hourlyRate,
      archivedAt: user.archivedAt,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.organizationId, orgId))
    .orderBy(asc(user.createdAt))

  const formatted = employees.map((e) => ({
    id: e.id,
    name: e.name,
    email: e.email,
    role: e.role,
    color: e.color ?? "",
    hourlyRate: e.hourlyRate != null ? parseFloat(e.hourlyRate) : null,
    isArchived: e.archivedAt !== null,
    createdAt: new Date(e.createdAt).toLocaleDateString("sk-SK", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }),
  }))

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <EmployeesTable employees={formatted} currentUserId={session.user.id} />
    </div>
  )
}
