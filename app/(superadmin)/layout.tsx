export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { SuperadminHeader } from "./superadmin/_components/superadmin-header"

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect("/login")
  const role = (session.user as { role?: string }).role
  if (role !== "superadmin") redirect("/")

  return (
    <div className="min-h-screen bg-background">
      <SuperadminHeader />
      <main className="p-6">{children}</main>
    </div>
  )
}
