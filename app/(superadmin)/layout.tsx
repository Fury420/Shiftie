export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect("/login")
  const role = (session.user as { role?: string }).role
  if (role !== "superadmin") redirect("/")

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-3 flex items-center gap-3">
        <span className="font-semibold text-sm">Shiftie</span>
        <span className="text-muted-foreground text-sm">·</span>
        <span className="text-sm text-muted-foreground">Superadmin</span>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
