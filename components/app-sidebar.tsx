"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Clock, Calendar, Users, CalendarCog, BarChart3, ArrowLeftRight } from "lucide-react"
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
} from "@/components/ui/sidebar"

const employeeNav = [
  { href: "/attendance", label: "Dochádzka", icon: Clock },
  { href: "/schedule", label: "Plán smien", icon: Calendar },
  { href: "/zastup", label: "Zastup", icon: ArrowLeftRight },
]

const adminNav = [
  { href: "/admin/employees", label: "Zamestnanci", icon: Users },
  { href: "/admin/schedule", label: "Správa smien", icon: CalendarCog },
  { href: "/admin/reports", label: "Reporty", icon: BarChart3 },
]

interface AppSidebarProps {
  user: { name: string; email: string; role: string }
  pendingReplacementCount: number
}

export function AppSidebar({ user, pendingReplacementCount }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="none" className="sticky top-0 h-svh w-52 min-w-52 overflow-hidden">
      <SidebarHeader className="px-4 py-4">
        <span className="text-lg font-semibold tracking-tight">OnShift</span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {employeeNav.map(({ href, label, icon: Icon }) => (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton asChild isActive={pathname.startsWith(href)}>
                  <Link href={href}>
                    <Icon />
                    <span>{label}</span>
                    {href === "/zastup" && pendingReplacementCount > 0 && (
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
                      <Link href={href}>
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
