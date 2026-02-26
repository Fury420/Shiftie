"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { LogOut, ChevronDown, Moon, Settings } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { signOut } from "@/lib/auth-client"
import { ProfileSettingsDialog } from "@/components/profile-settings-dialog"

interface UserMenuProps {
  user: { name: string; email: string; color?: string | null }
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [settingsOpen, setSettingsOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    router.push("/login")
    router.refresh()
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent transition-colors">
            <Avatar className="size-7">
              <AvatarFallback
                className="text-xs text-white font-semibold"
                style={{ backgroundColor: user.color ?? undefined }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start leading-tight">
              <span className="font-medium">{user.name}</span>
              <span className="text-xs text-muted-foreground truncate max-w-[160px]">{user.email}</span>
            </div>
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              setSettingsOpen(true)
            }}
          >
            <Settings className="size-4" />
            Nastavenia profilu
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            onSelect={(e) => e.preventDefault()}
          >
            <Moon className="size-4" />
            <span className="flex-1">Tmavý režim</span>
            <Switch checked={resolvedTheme === "dark"} />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
            <LogOut />
            Odhlásiť sa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        currentColor={user.color}
      />
    </>
  )
}
