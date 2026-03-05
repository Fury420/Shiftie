export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { UserMenu } from "@/components/user-menu"
import { getSession } from "@/lib/session"
import { db } from "@/db"
import { shiftReplacements, organizations, userOrganizations } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  const sessionUser = session.user as { role?: string; color?: string | null; mustChangePassword?: boolean; organizationId?: string | null }

  if (sessionUser.mustChangePassword) {
    redirect("/set-password")
  }

  if (sessionUser.role === "superadmin") {
    redirect("/superadmin")
  }

  const userOrgs = sessionUser.organizationId
    ? await db
        .select({ id: organizations.id, name: organizations.name })
        .from(userOrganizations)
        .innerJoin(organizations, eq(userOrganizations.organizationId, organizations.id))
        .where(eq(userOrganizations.userId, session.user.id))
    : []

  const cookieStore = await cookies()
  const cookieOrgId = cookieStore.get("activeOrgId")?.value
  const activeOrg =
    userOrgs.find((o) => o.id === cookieOrgId) ??
    userOrgs.find((o) => o.id === sessionUser.organizationId) ??
    userOrgs[0] ??
    null

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
      <AppSidebar
        user={user}
        orgs={userOrgs}
        activeOrgId={activeOrg?.id ?? null}
        pendingReplacementCount={pendingReplacements.length}
      />
      <SidebarInset className="rounded-xl overflow-hidden shadow-sm dark:bg-card">
        <header className="flex h-12 items-center border-b px-4 gap-2">
          <SidebarTrigger className="md:hidden" />
          <div className="ml-auto">
            <UserMenu user={user} />
          </div>
        </header>
        <main className="w-full flex-1 p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
