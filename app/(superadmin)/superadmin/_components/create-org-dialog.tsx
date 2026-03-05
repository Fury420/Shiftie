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
        ico: fd.get("ico") as string,
        dic: fd.get("dic") as string,
        address: fd.get("address") as string,
        phone: fd.get("phone") as string,
        email: fd.get("email") as string,
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
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nová organizácia</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Údaje o firme</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Názov firmy</Label>
            <Input id="name" name="name" required placeholder="napr. Bar Centrum s.r.o." />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ico">IČO</Label>
            <Input id="ico" name="ico" placeholder="12345678" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dic">DIČ</Label>
            <Input id="dic" name="dic" placeholder="SK1234567890" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Adresa</Label>
            <Input id="address" name="address" placeholder="Hlavná 1, 811 01 Bratislava" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Telefón</Label>
            <Input id="phone" name="phone" type="tel" placeholder="+421 900 000 000" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="info@bar.sk" />
          </div>

          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide pt-2">Admin účet</p>
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
