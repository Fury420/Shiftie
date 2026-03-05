"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { updateOrganization } from "@/app/actions/organizations"

interface OrgDetail {
  id: string
  name: string
  ico: string | null
  dic: string | null
  address: string | null
  phone: string | null
  email: string | null
}

interface Props {
  org: OrgDetail | null
  onClose: () => void
}

export function EditOrgDialog({ org, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (org) setError(null)
  }, [org])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!org) return
    const fd = new FormData(e.currentTarget)
    setLoading(true)
    setError(null)
    try {
      await updateOrganization(org.id, {
        name: fd.get("name") as string,
        ico: fd.get("ico") as string,
        dic: fd.get("dic") as string,
        address: fd.get("address") as string,
        phone: fd.get("phone") as string,
        email: fd.get("email") as string,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!org} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Upraviť organizáciu</DialogTitle>
        </DialogHeader>
        {org && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Názov</Label>
              <Input id="name" name="name" required defaultValue={org.name} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ico">IČO</Label>
              <Input id="ico" name="ico" defaultValue={org.ico ?? ""} placeholder="12345678" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dic">DIČ</Label>
              <Input id="dic" name="dic" defaultValue={org.dic ?? ""} placeholder="SK1234567890" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address">Adresa</Label>
              <Input id="address" name="address" defaultValue={org.address ?? ""} placeholder="Hlavná 1, 811 01 Bratislava" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Telefón</Label>
              <Input id="phone" name="phone" type="tel" defaultValue={org.phone ?? ""} placeholder="+421 900 000 000" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={org.email ?? ""} placeholder="info@bar.sk" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Ukladám..." : "Uložiť"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
