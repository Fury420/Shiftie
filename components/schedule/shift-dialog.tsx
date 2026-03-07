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
import { createShift, createShiftsBatch, updateShift } from "@/app/actions/schedule"
import { cn } from "@/lib/utils"

// "__open__" = voľná zmena (žiadny zamestnanec)
const OPEN_SHIFT_VALUE = "__open__"

const DAY_LABELS = [
  { value: 1, label: "Po" },
  { value: 2, label: "Ut" },
  { value: 3, label: "St" },
  { value: 4, label: "Št" },
  { value: 5, label: "Pi" },
  { value: 6, label: "So" },
  { value: 0, label: "Ne" },
]

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
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0])
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
      setDateFrom(initialDate)
      setDateTo(isEdit ? initialDate : initialDate)
      setSelectedDays([1, 2, 3, 4, 5, 6, 0])
      setStartTime(shift?.startTime ?? times?.start ?? "")
      setEndTime(shift?.endTime ?? times?.end ?? "")
      setNote(shift?.note ?? "")
      setError("")
    }
  }, [open, shift, defaultDate, employees, isEdit])

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  // Auto-fill times when dateFrom changes in create mode
  function handleDateFromChange(val: string) {
    setDateFrom(val)
    if (!isEdit && val) {
      const { start, end } = defaultTimes(val)
      setStartTime(start)
      setEndTime(end)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!isEdit && selectedDays.length === 0) {
      setError("Vyberte aspoň jeden deň v týždni.")
      return
    }

    const resolvedUserId = userId === OPEN_SHIFT_VALUE ? null : userId
    startTransition(async () => {
      try {
        if (isEdit) {
          await updateShift(shift.id, { userId: resolvedUserId, date: dateFrom, startTime, endTime, note })
        } else if (dateFrom === dateTo) {
          // Single date — use original createShift
          await createShift({ userId: resolvedUserId, date: dateFrom, startTime, endTime, note })
        } else {
          // Date range — batch create
          await createShiftsBatch({
            userId: resolvedUserId,
            dateFrom,
            dateTo,
            days: selectedDays,
            startTime,
            endTime,
            note,
          })
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

          {isEdit ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dateFrom">Dátum</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => handleDateFromChange(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dateFrom">Dátum od</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dateTo">Dátum do</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min={dateFrom}
                  required
                />
              </div>
            </div>
          )}

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

          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <Label>Dni v týždni</Label>
              <div className="flex gap-1">
                {DAY_LABELS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleDay(value)}
                    className={cn(
                      "flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors",
                      selectedDays.includes(value)
                        ? "bg-muted text-foreground border-border"
                        : "bg-transparent text-muted-foreground/50 border-border/50 line-through hover:bg-muted/50"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

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
