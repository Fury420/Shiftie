import { db } from "@/db"
import { user } from "@/db/schema"
import { asc } from "drizzle-orm"
import { requireAdmin } from "@/lib/auth-guard"
import { EmployeesTable } from "@/components/employees/employees-table"

export default async function AdminEmployeesPage() {
  const session = await requireAdmin()

  const employees = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      defaultDays: user.defaultDays,
      color: user.color,
      archivedAt: user.archivedAt,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(asc(user.createdAt))

  const formatted = employees.map((e) => ({
    id: e.id,
    name: e.name,
    email: e.email,
    role: e.role,
    defaultDays: e.defaultDays ?? "",
    color: e.color ?? "",
    isArchived: e.archivedAt !== null,
    createdAt: new Date(e.createdAt).toLocaleDateString("sk-SK", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }),
  }))

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <EmployeesTable employees={formatted} currentUserId={session.user.id} />
    </div>
  )
}
