import { redirect } from "next/navigation"
import { getSession } from "./session"

export async function requireAdmin() {
  const session = await getSession()
  if (!session) redirect("/login")
  const role = (session.user as { role?: string }).role
  if (role !== "admin") redirect("/attendance")
  return session
}
