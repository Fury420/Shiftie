import { redirect } from "next/navigation"
import { getSession } from "./session"

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
  const orgId = (session.user as { organizationId?: string | null }).organizationId
  if (!orgId) throw new Error("Používateľ nemá organizáciu")
  return orgId
}
