import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { getSession } from "./session"
import { db } from "@/db"
import { userOrganizations } from "@/db/schema"
import { and, eq } from "drizzle-orm"

export async function requireAdmin() {
  const session = await getSession()
  if (!session) redirect("/login")
  const role = (session.user as { role?: string }).role
  if (role !== "admin") redirect("/")
  return session
}

export async function requireSuperAdmin() {
  const session = await getSession()
  if (!session) redirect("/login")
  const role = (session.user as { role?: string }).role
  if (role !== "superadmin") redirect("/")
  return session
}

export async function getOrganizationId(): Promise<string> {
  const session = await getSession()
  if (!session) throw new Error("Neprihlásený")

  const cookieStore = await cookies()
  const cookieOrgId = cookieStore.get("activeOrgId")?.value

  if (cookieOrgId) {
    const [membership] = await db
      .select({ organizationId: userOrganizations.organizationId })
      .from(userOrganizations)
      .where(
        and(
          eq(userOrganizations.userId, session.user.id),
          eq(userOrganizations.organizationId, cookieOrgId),
        ),
      )
      .limit(1)
    if (membership) return membership.organizationId
    // stale cookie → fallthrough
  }

  const orgId = (session.user as { organizationId?: string | null }).organizationId
  if (!orgId) throw new Error("Používateľ nemá organizáciu")
  return orgId
}
