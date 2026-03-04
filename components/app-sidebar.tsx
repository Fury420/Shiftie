"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Clock, Calendar, Users, CalendarCog, BarChart3, ArrowLeftRight, Banknote } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"

const employeeNav = [
  { href: "/attendance", label: "Dochádzka", icon: Clock },
  { href: "/schedule", label: "Plán zmien", icon: Calendar },
  { href: "/replacements", label: "Zastup", icon: ArrowLeftRight },
]

const adminNav = [
  { href: "/admin/employees", label: "Zamestnanci", icon: Users },
  { href: "/admin/schedule", label: "Správa zmien", icon: CalendarCog },
  { href: "/admin/reports", label: "Reporty", icon: BarChart3 },
  { href: "/admin/wages", label: "Mzdy", icon: Banknote },
]

interface AppSidebarProps {
  user: { name: string; email: string; role: string; color?: string | null }
  pendingReplacementCount: number
}

export function AppSidebar({ user, pendingReplacementCount }: AppSidebarProps) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="px-4 py-4">
        <Image src="/logo.png" alt="Shiftie" width={160} height={44} className="object-contain" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {employeeNav.map(({ href, label, icon: Icon }) => (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton asChild isActive={pathname.startsWith(href)}>
                  <Link href={href} onClick={() => setOpenMobile(false)}>
                    <Icon />
                    <span>{label}</span>
                    {href === "/replacements" && pendingReplacementCount > 0 && (
                      <span className="ml-auto size-2 rounded-full bg-destructive" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {user.role === "admin" && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Administrácia</SidebarGroupLabel>
              <SidebarMenu>
                {adminNav.map(({ href, label, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton asChild isActive={pathname.startsWith(href)}>
                      <Link href={href} onClick={() => setOpenMobile(false)}>
                        <Icon />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

    </Sidebar>
  )
}
