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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createShiftRule, updateShiftRule } from "@/app/actions/shift-rules"
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

const MONTH_DAY_PRESETS = [
  { label: "1.", value: 1 },
  { label: "15.", value: 15 },
  { label: "Posledný", value: -1 },
]

export interface ShiftRuleForEdit {
  id: string
  userId: string
  frequency: "once" | "weekly" | "monthly"
  date: string | null
  days: string | null
  dayOfMonth: string | null
  validFrom: string | null
  validUntil: string | null
  startTime: string | null
  endTime: string | null
  allDay: boolean
  note: string | null
}

export interface EmployeeOption {
  id: string
  name: string
}

// Keep old interface name for backwards compatibility with calendar
export type ShiftForEdit = ShiftRuleForEdit

interface ShiftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: EmployeeOption[]
  shift?: ShiftRuleForEdit
  defaultDate?: string
}

export function ShiftDialog({ open, onOpenChange, employees, shift, defaultDate }: ShiftDialogProps) {
  const isEdit = !!shift

  const [userId, setUserId] = useState("")
  const [frequency, setFrequency] = useState<"once" | "weekly" | "monthly">("once")
  const [date, setDate] = useState("")
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [selectedMonthDays, setSelectedMonthDays] = useState<number[]>([])
  const [monthDayInput, setMonthDayInput] = useState("")
  const [validFrom, setValidFrom] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [allDay, setAllDay] = useState(false)
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      if (shift) {
        setUserId(shift.userId || OPEN_SHIFT_VALUE)
        setFrequency(shift.frequency)
        setDate(shift.date ?? "")
        setSelectedDays(shift.days ? shift.days.split(",").map(Number) : [1, 2, 3, 4, 5])
        setSelectedMonthDays(shift.dayOfMonth ? shift.dayOfMonth.split(",").map(Number) : [])
        setMonthDayInput("")
        setValidFrom(shift.validFrom ?? "")
        setValidUntil(shift.validUntil ?? "")
        setStartTime(shift.startTime?.slice(0, 5) ?? "")
        setEndTime(shift.endTime?.slice(0, 5) ?? "")
        setAllDay(shift.allDay)
        setNote(shift.note ?? "")
      } else {
        setUserId(employees[0]?.id || OPEN_SHIFT_VALUE)
        setFrequency("once")
        setDate(defaultDate ?? "")
        setSelectedDays([1, 2, 3, 4, 5])
        setSelectedMonthDays([])
        setMonthDayInput("")
        setValidFrom("")
        setValidUntil("")
        setStartTime("16:00")
        setEndTime("21:00")
        setAllDay(false)
        setNote("")
      }
      setError("")
    }
  }, [open, shift, defaultDate, employees])

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    )
  }

  function toggleMonthDay(day: number) {
    setSelectedMonthDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    )
  }

  function addMonthDay() {
    const num = parseInt(monthDayInput)
    if (isNaN(num) || num < 1 || num > 31) return
    if (!selectedMonthDays.includes(num)) {
      setSelectedMonthDays((prev) => [...prev, num].sort((a, b) => a - b))
    }
    setMonthDayInput("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (frequency === "weekly" && selectedDays.length === 0) {
      setError("Vyberte aspoň jeden deň v týždni.")
      return
    }
    if (frequency === "monthly" && selectedMonthDays.length === 0) {
      setError("Vyberte aspoň jeden deň v mesiaci.")
      return
    }

    const resolvedUserId = userId === OPEN_SHIFT_VALUE ? null : userId

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateShiftRule(shift.id, {
            userId: resolvedUserId,
            frequency,
            date: frequency === "once" ? date : null,
            days: frequency === "weekly" ? selectedDays.join(",") : null,
            dayOfMonth: frequency === "monthly" ? selectedMonthDays.join(",") : null,
            validFrom: frequency !== "once" ? validFrom || null : null,
            validUntil: frequency !== "once" ? validUntil || null : null,
            startTime: allDay ? null : startTime,
            endTime: allDay ? null : endTime,
            allDay,
            note: note || null,
          })
        } else {
          await createShiftRule({
            userId: resolvedUserId,
            frequency,
            date: frequency === "once" ? date : undefined,
            days: frequency === "weekly" ? selectedDays.join(",") : undefined,
            dayOfMonth: frequency === "monthly" ? selectedMonthDays.join(",") : undefined,
            validFrom: frequency !== "once" ? validFrom || undefined : undefined,
            validUntil: frequency !== "once" ? validUntil || undefined : undefined,
            startTime: allDay ? undefined : startTime,
            endTime: allDay ? undefined : endTime,
            allDay,
            note: note || undefined,
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
          <DialogTitle>{isEdit ? "Upraviť pravidlo zmeny" : "Nová zmena"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Frequency tabs */}
          {!isEdit && (
            <Tabs value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
              <TabsList className="w-full">
                <TabsTrigger value="once" className="flex-1">Jednorazová</TabsTrigger>
                <TabsTrigger value="weekly" className="flex-1">Týždenná</TabsTrigger>
                <TabsTrigger value="monthly" className="flex-1">Mesačná</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {isEdit && (
            <div className="flex flex-col gap-1.5">
              <Label>Typ</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Jednorazová</SelectItem>
                  <SelectItem value="weekly">Týždenná</SelectItem>
                  <SelectItem value="monthly">Mesačná</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Employee */}
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

          {/* Date — once */}
          {frequency === "once" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date">Dátum</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          )}

          {/* Days — weekly */}
          {frequency === "weekly" && (
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
                        : "bg-transparent text-muted-foreground/50 border-border/50 hover:bg-muted/50",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Days — monthly */}
          {frequency === "monthly" && (
            <div className="flex flex-col gap-1.5">
              <Label>Dni v mesiaci</Label>
              <div className="flex flex-wrap gap-1.5">
                {MONTH_DAY_PRESETS.map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleMonthDay(value)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                      selectedMonthDays.includes(value)
                        ? "bg-muted text-foreground border-border"
                        : "bg-transparent text-muted-foreground/50 border-border/50 hover:bg-muted/50",
                    )}
                  >
                    {label}
                  </button>
                ))}
                {selectedMonthDays
                  .filter((d) => !MONTH_DAY_PRESETS.some((p) => p.value === d))
                  .map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleMonthDay(d)}
                      className="rounded-md border bg-muted text-foreground border-border px-3 py-1.5 text-sm font-medium"
                    >
                      {d}.
                    </button>
                  ))}
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={monthDayInput}
                  onChange={(e) => setMonthDayInput(e.target.value)}
                  placeholder="Deň (1–31)"
                  className="flex-1"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMonthDay() } }}
                />
                <Button type="button" variant="outline" size="sm" onClick={addMonthDay}>
                  Pridať
                </Button>
              </div>
            </div>
          )}

          {/* Valid from/until — recurring */}
          {frequency !== "once" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="validFrom">Platí od</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="validUntil">Platí do</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  min={validFrom}
                  required
                />
              </div>
            </div>
          )}

          {/* All day checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="allDay"
              checked={allDay}
              onCheckedChange={(c) => setAllDay(c === true)}
            />
            <Label htmlFor="allDay" className="text-sm font-normal cursor-pointer">
              Celý deň (podľa otváracích hodín)
            </Label>
          </div>

          {/* Start/end time */}
          {!allDay && (
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
          )}

          {/* Note */}
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
