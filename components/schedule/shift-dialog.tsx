"use client"

import { useState, useEffect, useTransition, useMemo } from "react"
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
import { createShiftsBatch, updateShift } from "@/app/actions/schedule"
import { cn } from "@/lib/utils"
import { ArrowLeft, X } from "lucide-react"

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

const DAY_NAMES: Record<number, string> = {
  0: "Nedeľa",
  1: "Pondelok",
  2: "Utorok",
  3: "Streda",
  4: "Štvrtok",
  5: "Piatok",
  6: "Sobota",
}

// Mon–Thu: 16:00–21:00 | Fri–Sun: 15:00–21:00
function defaultTimes(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number)
  const day = new Date(y, m - 1, d).getDay()
  const isWeekend = day === 5 || day === 6 || day === 0
  return { start: isWeekend ? "15:00" : "16:00", end: "21:00" }
}

function generateDates(dateFrom: string, dateTo: string, days: number[]): string[] {
  if (!dateFrom || !dateTo) return []
  const [fy, fm, fd] = dateFrom.split("-").map(Number)
  const [ty, tm, td] = dateTo.split("-").map(Number)
  const from = new Date(fy, fm - 1, fd, 12, 0, 0)
  const to = new Date(ty, tm - 1, td, 12, 0, 0)
  const result: string[] = []
  const cur = new Date(from)
  while (cur <= to) {
    if (days.includes(cur.getDay())) {
      const y = cur.getFullYear()
      const m = String(cur.getMonth() + 1).padStart(2, "0")
      const d = String(cur.getDate()).padStart(2, "0")
      result.push(`${y}-${m}-${d}`)
    }
    cur.setDate(cur.getDate() + 1)
  }
  return result
}

function formatDateSk(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d, 12, 0, 0)
  return `${DAY_NAMES[date.getDay()]} ${d}. ${m}. ${y}`
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
  const [showPreview, setShowPreview] = useState(false)
  const [excludedDates, setExcludedDates] = useState<Set<string>>(new Set())

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
      setShowPreview(false)
      setExcludedDates(new Set())
    }
  }, [open, shift, defaultDate, employees, isEdit])

  const rangeSpan = useMemo(() => {
    if (!dateFrom || !dateTo) return 0
    const [fy, fm, fd] = dateFrom.split("-").map(Number)
    const [ty, tm, td] = dateTo.split("-").map(Number)
    const from = new Date(fy, fm - 1, fd)
    const to = new Date(ty, tm - 1, td)
    return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }, [dateFrom, dateTo])

  const showDayFilter = rangeSpan > 7

  const previewDates = useMemo(
    () => generateDates(dateFrom, dateTo, showDayFilter ? selectedDays : [0, 1, 2, 3, 4, 5, 6]),
    [dateFrom, dateTo, selectedDays, showDayFilter],
  )

  const finalDates = useMemo(
    () => previewDates.filter((d) => !excludedDates.has(d)),
    [previewDates, excludedDates],
  )

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  function toggleExcludeDate(date: string) {
    setExcludedDates((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
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

  function handleShowPreview(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (showDayFilter && selectedDays.length === 0) {
      setError("Vyberte aspoň jeden deň v týždni.")
      return
    }

    if (previewDates.length === 0) {
      setError("Žiadne zmeny na vytvorenie pre zvolený rozsah a dni.")
      return
    }

    setExcludedDates(new Set())
    setShowPreview(true)
  }

  function handleSubmit() {
    setError("")

    if (finalDates.length === 0) {
      setError("Žiadne zmeny na vytvorenie.")
      return
    }

    const resolvedUserId = userId === OPEN_SHIFT_VALUE ? null : userId
    startTransition(async () => {
      try {
        if (isEdit) {
          await updateShift(shift.id, { userId: resolvedUserId, date: dateFrom, startTime, endTime, note })
        } else {
          await createShiftsBatch({
            userId: resolvedUserId,
            dateFrom,
            dateTo,
            days: showDayFilter ? selectedDays : [0, 1, 2, 3, 4, 5, 6],
            excludeDates: [...excludedDates],
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

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const resolvedUserId = userId === OPEN_SHIFT_VALUE ? null : userId
    startTransition(async () => {
      try {
        await updateShift(shift!.id, { userId: resolvedUserId, date: dateFrom, startTime, endTime, note })
        onOpenChange(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nastala chyba")
      }
    })
  }

  const employeeName = userId === OPEN_SHIFT_VALUE
    ? "Voľná zmena"
    : employees.find((e) => e.id === userId)?.name ?? "—"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {!isEdit && showPreview ? (
          <>
            <DialogHeader>
              <DialogTitle>Náhľad zmien ({finalDates.length})</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              <div className="text-sm text-muted-foreground">
                {employeeName} · {startTime}–{endTime}
              </div>

              <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
                {previewDates.map((date) => {
                  const excluded = excludedDates.has(date)
                  return (
                    <div
                      key={date}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 text-sm",
                        excluded && "opacity-40",
                      )}
                    >
                      <span className={cn(excluded && "line-through")}>
                        {formatDateSk(date)}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleExcludeDate(date)}
                        className={cn(
                          "p-1 rounded-md transition-colors",
                          excluded
                            ? "text-muted-foreground hover:bg-muted"
                            : "text-destructive/70 hover:text-destructive hover:bg-destructive/10",
                        )}
                        title={excluded ? "Obnoviť" : "Vynechať"}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  )
                })}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPreview(false)}>
                <ArrowLeft className="size-4" />
                Späť
              </Button>
              <Button onClick={handleSubmit} disabled={isPending || finalDates.length === 0}>
                {isPending ? "Vytváram…" : `Vytvoriť ${finalDates.length} zmien`}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{isEdit ? "Upraviť zmenu" : "Nová zmena"}</DialogTitle>
            </DialogHeader>

            <form onSubmit={isEdit ? handleEditSubmit : handleShowPreview} className="flex flex-col gap-4">
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

              {!isEdit && showDayFilter && (
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
                            : "bg-transparent text-muted-foreground/50 border-border/50 hover:bg-muted/50"
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
                  {isPending ? "Ukladám…" : isEdit ? "Uložiť" : "Náhľad"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
