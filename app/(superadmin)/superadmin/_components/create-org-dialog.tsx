"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { createOrganization } from "@/app/actions/organizations"

export function CreateOrgDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setLoading(true)
    setError(null)
    try {
      await createOrganization({
        name: fd.get("name") as string,
        adminName: fd.get("adminName") as string,
        adminEmail: fd.get("adminEmail") as string,
        adminPassword: fd.get("adminPassword") as string,
      })
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4 mr-1" />
          Nová organizácia
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nová organizácia</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Názov organizácie</Label>
            <Input id="name" name="name" required placeholder="napr. Bar Centrum" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adminName">Meno admina</Label>
            <Input id="adminName" name="adminName" required placeholder="Ján Novák" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adminEmail">Email admina</Label>
            <Input id="adminEmail" name="adminEmail" type="email" required placeholder="admin@bar.sk" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adminPassword">Heslo admina</Label>
            <Input id="adminPassword" name="adminPassword" type="password" required minLength={8} placeholder="min. 8 znakov" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Vytváram..." : "Vytvoriť"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
