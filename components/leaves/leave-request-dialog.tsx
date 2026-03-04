"use client"

import { useState, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { requestLeave, updateLeave } from "@/app/actions/leaves"

export interface LeaveForEdit {
  id: string
  type: "vacation" | "sick" | "personal"
  startDate: string
  endDate: string
  note: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  leave?: LeaveForEdit
  defaultDate?: string
}

export function LeaveRequestDialog({ open, onOpenChange, leave, defaultDate }: Props) {
  const isEdit = !!leave
  const [type, setType] = useState<"vacation" | "sick" | "personal">("vacation")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setType(leave?.type ?? "vacation")
      setStartDate(leave?.startDate ?? defaultDate ?? "")
      setEndDate(leave?.endDate ?? defaultDate ?? "")
      setNote(leave?.note ?? "")
      setError("")
    }
  }, [open, leave, defaultDate])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!startDate || !endDate) {
      setError("Vyplňte dátum od aj do.")
      return
    }
    if (startDate > endDate) {
      setError("Dátum od musí byť pred dátumom do.")
      return
    }

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateLeave(leave.id, { type, startDate, endDate, note })
        } else {
          await requestLeave({ type, startDate, endDate, note })
        }
        onOpenChange(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nastala chyba")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Upraviť žiadosť" : "Nová žiadosť o voľno"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Typ</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vacation">Dovolenka</SelectItem>
                <SelectItem value="sick">PN (pracovná neschopnosť)</SelectItem>
                <SelectItem value="personal">Osobné voľno</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startDate">Dátum od</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endDate">Dátum do</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">Poznámka (nepovinná)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Zrušiť
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (isEdit ? "Ukladám…" : "Odosielam…") : isEdit ? "Uložiť" : "Odoslať žiadosť"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
