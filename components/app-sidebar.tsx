"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTransition } from "react"
import { Clock, Calendar, Users, CalendarCog, BarChart3, Banknote, Umbrella, ClipboardList, Building2, ChevronsUpDown, Check } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { switchOrganization } from "@/app/actions/organizations"

const employeeNav = [
  { href: "/attendance", label: "Dochádzka", icon: Clock },
  { href: "/schedule", label: "Plán zmien", icon: Calendar },
  { href: "/replacements", label: "Žiadosti", icon: ClipboardList },
]

const adminNav = [
  { href: "/admin/employees", label: "Zamestnanci", icon: Users },
  { href: "/admin/schedule", label: "Správa zmien", icon: CalendarCog },
  { href: "/admin/reports", label: "Reporty", icon: BarChart3 },
  { href: "/admin/wages", label: "Mzdy", icon: Banknote },
  { href: "/admin/leaves", label: "Dovolenky", icon: Umbrella },
]

interface AppSidebarProps {
  user: { name: string; email: string; role: string; color?: string | null }
  orgs: { id: string; name: string }[]
  activeOrgId: string | null
  pendingReplacementCount: number
}

export function AppSidebar({ user, orgs, activeOrgId, pendingReplacementCount }: AppSidebarProps) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const [isPending, startTransition] = useTransition()

  const activeOrg = orgs.find((o) => o.id === activeOrgId) ?? orgs[0] ?? null

  function handleSwitch(orgId: string) {
    startTransition(async () => {
      await switchOrganization(orgId)
    })
  }

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="px-4 py-4 flex flex-col items-center gap-2">
        <Link href="/" onClick={() => setOpenMobile(false)}>
          <Image src="/logo.png" alt="Shiftie" width={160} height={44} className="object-contain" unoptimized />
        </Link>

        {activeOrg && (
          orgs.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                  disabled={isPending}
                >
                  <Building2 className="size-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate text-left font-medium">{activeOrg.name}</span>
                  <ChevronsUpDown className="size-4 text-muted-foreground shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {orgs.map((org) => (
                  <DropdownMenuItem
                    key={org.id}
                    onSelect={() => handleSwitch(org.id)}
                    className="flex items-center gap-2"
                  >
                    <Building2 className="size-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{org.name}</span>
                    {org.id === activeOrgId && <Check className="size-4 shrink-0" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex w-full items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
              <Building2 className="size-4 shrink-0" />
              <span className="truncate">{activeOrg.name}</span>
            </div>
          )
        )}
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
