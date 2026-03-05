"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/auth-client"

export function SuperadminHeader() {
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push("/login")
  }

  return (
    <header className="border-b px-6 py-3 flex items-center gap-3">
      <span className="font-semibold text-sm">Shiftie</span>
      <span className="text-muted-foreground text-sm">·</span>
      <span className="text-sm text-muted-foreground">Superadmin</span>
      <div className="ml-auto">
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
          <LogOut className="size-4" />
          Odhlásiť sa
        </Button>
      </div>
    </header>
  )
}
