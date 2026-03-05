export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { SuperadminSidebar } from "@/components/superadmin-sidebar"
import { UserMenu } from "@/components/user-menu"

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect("/login")
  const sessionUser = session.user as { role?: string; color?: string | null }
  if (sessionUser.role !== "superadmin") redirect("/")

  const user = {
    name: session.user.name,
    email: session.user.email,
    color: sessionUser.color ?? null,
  }

  return (
    <SidebarProvider className="bg-black p-2 gap-2">
      <SuperadminSidebar />
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
