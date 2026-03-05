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
import { createShift, updateShift } from "@/app/actions/schedule"

// "__open__" = voľná zmena (žiadny zamestnanec)
const OPEN_SHIFT_VALUE = "__open__"

// Mon–Thu: 16:00–21:00 | Fri–Sun: 15:00–21:00
function defaultTimes(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number)
  const day = new Date(y, m - 1, d).getDay()
  const isWeekend = day === 5 || day === 6 || day === 0
  return { start: isWeekend ? "15:00" : "16:00", end: "21:00" }
}

export interface ShiftForEdit {
  id: string
  userId: string // "" means open shift
  date: string      // YYYY-MM-DD
  startTime: string // HH:MM
  endTime: string   // HH:MM
  note: string | null
}

export interface EmployeeOption {
  id: string
  name: string
}

interface ShiftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: EmployeeOption[]
  shift?: ShiftForEdit
  defaultDate?: string // YYYY-MM-DD — pre-fills date when opening from a day
}

export function ShiftDialog({ open, onOpenChange, employees, shift, defaultDate }: ShiftDialogProps) {
  const isEdit = !!shift

  const [userId, setUserId] = useState("")
  const [date, setDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      const initialDate = shift?.date ?? defaultDate ?? ""
      const times = !shift && initialDate ? defaultTimes(initialDate) : null
      setUserId(shift?.userId || employees[0]?.id || OPEN_SHIFT_VALUE)
      setDate(initialDate)
      setStartTime(shift?.startTime ?? times?.start ?? "")
      setEndTime(shift?.endTime ?? times?.end ?? "")
      setNote(shift?.note ?? "")
      setError("")
    }
  }, [open, shift, defaultDate, employees])

  // Auto-fill times when date changes in create mode
  function handleDateChange(val: string) {
    setDate(val)
    if (!isEdit && val) {
      const { start, end } = defaultTimes(val)
      setStartTime(start)
      setEndTime(end)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    const resolvedUserId = userId === OPEN_SHIFT_VALUE ? null : userId
    startTransition(async () => {
      try {
        if (isEdit) {
          await updateShift(shift.id, { userId: resolvedUserId, date, startTime, endTime, note })
        } else {
          await createShift({ userId: resolvedUserId, date, startTime, endTime, note })
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
          <DialogTitle>{isEdit ? "Upraviť zmenu" : "Nová zmena"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Zamestnanec</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte zamestnanca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OPEN_SHIFT_VALUE}>
                  <span className="text-muted-foreground">Voľná zmena (bez zamestnanca)</span>
                </SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date">Dátum</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startTime">Začiatok</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endTime">Koniec</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
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
              placeholder="Napr. záskok, špeciálna udalosť…"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Zrušiť
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Ukladám…" : isEdit ? "Uložiť" : "Vytvoriť"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
