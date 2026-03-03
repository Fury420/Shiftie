export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { UserMenu } from "@/components/user-menu"
import { getSession } from "@/lib/session"
import { db } from "@/db"
import { shiftReplacements } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  const sessionUser = session.user as { role?: string; color?: string | null; mustChangePassword?: boolean }

  if (sessionUser.mustChangePassword) {
    redirect("/set-password")
  }
  const user = {
    name: session.user.name,
    email: session.user.email,
    role: sessionUser.role ?? "employee",
    color: sessionUser.color ?? null,
  }

  const pendingReplacements = await db
    .select({ id: shiftReplacements.id })
    .from(shiftReplacements)
    .where(
      and(
        eq(shiftReplacements.replacementUserId, session.user.id),
        eq(shiftReplacements.status, "pending"),
      ),
    )

  return (
    <SidebarProvider className="bg-black p-2 gap-2">
      <AppSidebar user={user} pendingReplacementCount={pendingReplacements.length} />
      <SidebarInset className="rounded-xl overflow-hidden shadow-sm dark:bg-card">
        <header className="flex h-12 items-center border-b px-4 gap-2">
          <SidebarTrigger className="md:hidden" />
          <div className="ml-auto">
            <UserMenu user={user} />
          </div>
        </header>
        <main className="w-full flex-1 p-3 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
