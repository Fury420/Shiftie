"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Plus, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ShiftDialog, type ShiftRuleForEdit, type EmployeeOption } from "./shift-dialog"
import { deleteShift, toggleShiftStatus, publishDraftShifts, approveShiftClaim, rejectShiftClaim, approveShiftRequest, rejectShiftRequest } from "@/app/actions/schedule"
import { deleteShiftRule, skipRuleInstance, toggleShiftRuleStatus } from "@/app/actions/shift-rules"
import { Check, X } from "lucide-react"
import { toast } from "sonner"

export interface AdminCalendarShift {
  id: string
  ruleId: string | null
  userId: string
  userName: string
  date: string
  startTime: string
  endTime: string
  note: string | null
  status: "requested" | "draft" | "open" | "published"
  color: string
  isRule: boolean
  exceptionId?: string
}

export interface AdminOpenShift {
  id: string
  date: string
  startTime: string
  endTime: string
  note: string | null
  claims: { claimId: string; userId: string; userName: string; color: string }[]
}

export interface AdminRequestedShift {
  id: string
  userId: string
  userName: string
  color: string
  date: string
  startTime: string
  endTime: string
  note: string | null
}

export interface AdminCalendarDay {
  date: string
  isCurrentMonth: boolean
  isToday: boolean
  shifts: AdminCalendarShift[]
  openShifts: AdminOpenShift[]
  requestedShifts: AdminRequestedShift[]
}

export interface BusinessHoursEntry {
  dayOfWeek: string
  isClosed: boolean
  openTime: string | null
  closeTime: string | null
}

interface AdminMonthCalendarProps {
  weeks: AdminCalendarDay[][]
  employees: EmployeeOption[]
  monthLabel: string
  prevMonth: string
  nextMonth: string
  businessHours?: Map<string, BusinessHoursEntry>
}

const DAY_LABELS = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"]

export function AdminMonthCalendar({
  weeks,
  employees,
  monthLabel,
  prevMonth,
  nextMonth,
  businessHours,
}: AdminMonthCalendarProps) {
  const router = useRouter()
  const [view, setView] = useState<"month" | "week">("month")
  const [weekIdx, setWeekIdx] = useState(() => {
    const today = new Date().toISOString().slice(0, 10)
    const idx = weeks.findIndex((w) => w.some((d) => d.date === today))
    return idx >= 0 ? idx : 0
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ShiftRuleForEdit | undefined>()
  const [defaultDate, setDefaultDate] = useState<string | undefined>()
  const [isPending, startTransition] = useTransition()

  const currentWeek = weeks[weekIdx] ?? weeks[0]
  const weekLabel = (() => {
    const s = new Date(currentWeek[0].date + "T12:00:00")
    const e = new Date(currentWeek[6].date + "T12:00:00")
    const fmt = (d: Date) => d.toLocaleDateString("sk-SK", { day: "numeric", month: "numeric" })
    return `${fmt(s)} – ${fmt(e)}`
  })()

  function handlePrevWeek() {
    if (weekIdx > 0) setWeekIdx(weekIdx - 1)
    else router.push(`/admin/schedule?month=${prevMonth}`)
  }
  function handleNextWeek() {
    if (weekIdx < weeks.length - 1) setWeekIdx(weekIdx + 1)
    else router.push(`/admin/schedule?month=${nextMonth}`)
  }

  const allDraftIds = weeks.flatMap((week) =>
    week.flatMap((day) => day.shifts.filter((s) => s.status === "draft" && !s.isRule).map((s) => s.id)),
  )

  const allDraftRuleIds = [...new Set(
    weeks.flatMap((week) =>
      week.flatMap((day) => day.shifts.filter((s) => s.status === "draft" && s.isRule && s.ruleId).map((s) => s.ruleId!)),
    ),
  )]

  function openCreate(date?: string) {
    setEditing(undefined)
    setDefaultDate(date)
    setDialogOpen(true)
  }

  function openEditRule(s: AdminCalendarShift) {
    if (s.isRule && s.ruleId) {
      // For rule-based shifts, we'd need to fetch the full rule data
      // For now, construct what we can from the instance
      setEditing({
        id: s.ruleId,
        userId: s.userId,
        frequency: "once", // Will be overridden by the dialog's fetch
        date: s.date,
        days: null,
        dayOfMonth: null,
        validFrom: null,
        validUntil: null,
        startTime: s.startTime,
        endTime: s.endTime,
        allDay: false,
        note: s.note,
      })
    } else {
      // Legacy shift — open as "once" rule edit
      setEditing({
        id: s.id,
        userId: s.userId,
        frequency: "once",
        date: s.date,
        days: null,
        dayOfMonth: null,
        validFrom: null,
        validUntil: null,
        startTime: s.startTime,
        endTime: s.endTime,
        allDay: false,
        note: s.note,
      })
    }
    setDefaultDate(undefined)
    setDialogOpen(true)
  }

  function handleDelete(id: string, isRule: boolean, ruleId?: string | null) {
    if (isRule && ruleId) {
      startTransition(() => deleteShiftRule(ruleId))
    } else {
      startTransition(() => deleteShift(id))
    }
  }

  function handleSkipInstance(ruleId: string, date: string) {
    startTransition(() => skipRuleInstance(ruleId, date))
  }

  function handleToggle(id: string, status: "draft" | "published", isRule: boolean, ruleId?: string | null) {
    if (isRule && ruleId) {
      startTransition(() => toggleShiftRuleStatus(ruleId, status))
    } else {
      startTransition(() => toggleShiftStatus(id, status))
    }
  }

  function handlePublishAll() {
    startTransition(async () => {
      if (allDraftIds.length > 0) await publishDraftShifts(allDraftIds)
      for (const ruleId of allDraftRuleIds) {
        await toggleShiftRuleStatus(ruleId, "draft")
      }
    })
  }

  function handleApproveRequest(shiftId: string) {
    startTransition(async () => {
      try {
        await approveShiftRequest(shiftId)
        toast.success("Požiadavka schválená")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Chyba")
      }
    })
  }

  function handleRejectRequest(shiftId: string) {
    startTransition(async () => {
      try {
        await rejectShiftRequest(shiftId)
        toast.success("Požiadavka zamietnutá")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Chyba")
      }
    })
  }

  function handleApprove(claimId: string) {
    startTransition(async () => {
      try {
        await approveShiftClaim(claimId)
        toast.success("Zmena priradená")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Chyba")
      }
    })
  }

  function handleReject(claimId: string) {
    startTransition(async () => {
      try {
        await rejectShiftClaim(claimId)
        toast.success("Prihlásenie zamietnuté")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Chyba")
      }
    })
  }

  return (
    <>
      <div className="flex flex-col gap-4 w-full">
        <div className="flex items-center justify-between gap-4">
          {view === "month" ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" asChild>
                <Link href={`/admin/schedule?month=${prevMonth}`}><ChevronLeft className="size-4" /></Link>
              </Button>
              <span className="text-sm font-medium min-w-40 text-center capitalize">{monthLabel}</span>
              <Button variant="outline" size="icon" asChild>
                <Link href={`/admin/schedule?month=${nextMonth}`}><ChevronRight className="size-4" /></Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevWeek}><ChevronLeft className="size-4" /></Button>
              <span className="text-sm font-medium min-w-40 text-center">{weekLabel}</span>
              <Button variant="outline" size="icon" onClick={handleNextWeek}><ChevronRight className="size-4" /></Button>
            </div>
          )}
          <div className="flex items-center gap-2">
            {allDraftIds.length > 0 && (
              <Button variant="secondary" size="sm" onClick={handlePublishAll} disabled={isPending}>
                <Send className="size-4" />
                Publikovať všetky ({allDraftIds.length})
              </Button>
            )}
            <Button size="sm" onClick={() => openCreate()}>
              <Plus className="size-4" />
              Nová zmena
            </Button>
            <div className="flex rounded-md border p-0.5 gap-0.5">
              <Button variant={view === "month" ? "secondary" : "ghost"} size="sm" className="h-7 px-3 text-xs" onClick={() => setView("month")}>Mesiac</Button>
              <Button variant={view === "week" ? "secondary" : "ghost"} size="sm" className="h-7 px-3 text-xs" onClick={() => setView("week")}>Týždeň</Button>
            </div>
          </div>
        </div>

        {/* ── Mobile: agenda list ─────────────────────────── */}
        {view === "month" && <div className="md:hidden flex flex-col gap-2">
          {weeks.flat().filter((d) => d.isCurrentMonth).map((day) => {
            const dateObj = new Date(day.date + "T12:00:00")
            const dayLabel = dateObj.toLocaleDateString("sk-SK", { weekday: "long", day: "numeric", month: "numeric" })
            return (
              <div
                key={day.date}
                className={cn(
                  "rounded-xl border p-3 flex flex-col gap-2",
                  day.isToday && "border-primary/40 bg-primary/5",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "size-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                        day.isToday ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {dateObj.getDate()}
                    </div>
                    <span className="text-sm font-medium capitalize">{dayLabel}</span>
                  </div>
                  <button
                    onClick={() => openCreate(day.date)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Plus className="size-4 text-muted-foreground" />
                  </button>
                </div>

                {day.shifts.length === 0 && day.openShifts.length === 0 && day.requestedShifts.length === 0 ? (
                  <p className="text-xs text-muted-foreground pl-10">Žiadne zmeny</p>
                ) : (
                  <div className="flex flex-col gap-1.5 pl-10">
                    {day.shifts.map((shift) => (
                      <DropdownMenu key={shift.id}>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={cn(
                              "w-full text-left rounded-lg px-3 py-2 hover:opacity-80 transition-opacity",
                              shift.status === "draft" && "opacity-60",
                            )}
                            style={{
                              backgroundColor: shift.color + "28",
                              borderLeft: `3px ${shift.status === "draft" ? "dashed" : "solid"} ${shift.color}`,
                            }}
                          >
                            <div className="text-sm font-semibold" style={{ color: shift.color }}>
                              {shift.userName.split(" ")[0]}
                            </div>
                            <div className="text-xs opacity-75" style={{ color: shift.color }}>
                              {shift.startTime}–{shift.endTime}
                              {shift.status === "draft" && " · koncept"}
                            </div>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {!(shift.isRule && shift.status === "published") && (
                            <DropdownMenuItem onClick={() => openEditRule(shift)}>{shift.isRule ? "Upraviť pravidlo" : "Upraviť"}</DropdownMenuItem>
                          )}
                          {shift.status !== "open" && (
                            <DropdownMenuItem onClick={() => handleToggle(shift.id, shift.status as "draft" | "published", shift.isRule, shift.ruleId)} disabled={isPending}>
                              {shift.status === "draft" ? "Publikovať" : "Zrušiť publikovanie"}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {shift.isRule && (
                            <DropdownMenuItem onClick={() => handleSkipInstance(shift.ruleId!, shift.date)} disabled={isPending} className="text-destructive">Odstrániť túto zmenu</DropdownMenuItem>
                          )}
                          {!(shift.isRule && shift.status === "published") && (
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(shift.id, shift.isRule, shift.ruleId)} disabled={isPending}>
                              {shift.isRule ? "Zmazať pravidlo" : "Odstrániť"}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ))}
                    {day.openShifts.map((os) => (
                      <div key={os.id} className="rounded-lg border border-dashed border-muted-foreground/30 px-3 py-2 flex flex-col gap-1.5 bg-muted/10">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-muted-foreground">Voľná zmena</div>
                            <div className="text-xs text-muted-foreground/70">{os.startTime}–{os.endTime}</div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded hover:bg-muted">
                                <Plus className="size-3.5 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditRule({ id: os.id, ruleId: null, userId: "", userName: "", date: os.date, startTime: os.startTime, endTime: os.endTime, note: os.note, status: "open", color: "", isRule: false })}>Upraviť</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(os.id, false)} disabled={isPending}>Odstrániť</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {os.claims.length > 0 && (
                          <div className="flex flex-col gap-1">
                            {os.claims.map((claim) => (
                              <div key={claim.claimId} className="flex items-center justify-between gap-2 rounded px-2 py-1" style={{ backgroundColor: claim.color + "18" }}>
                                <span className="text-xs font-medium" style={{ color: claim.color }}>{claim.userName.split(" ")[0]} ⏳</span>
                                <div className="flex gap-1">
                                  <button onClick={() => handleApprove(claim.claimId)} disabled={isPending} className="p-0.5 rounded hover:bg-green-100 text-green-600">
                                    <Check className="size-3.5" />
                                  </button>
                                  <button onClick={() => handleReject(claim.claimId)} disabled={isPending} className="p-0.5 rounded hover:bg-red-100 text-destructive">
                                    <X className="size-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {day.requestedShifts.map((rs) => (
                      <div key={rs.id} className="rounded-lg border border-dashed border-amber-400/60 px-3 py-2 flex flex-col gap-1.5 bg-amber-50/50 dark:bg-amber-950/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-amber-700 dark:text-amber-400" style={{ color: rs.color }}>{rs.userName.split(" ")[0]} — požiadavka</div>
                            <div className="text-xs text-muted-foreground">{rs.startTime}–{rs.endTime}</div>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => handleApproveRequest(rs.id)} disabled={isPending} className="p-1 rounded hover:bg-green-100 text-green-600">
                              <Check className="size-4" />
                            </button>
                            <button onClick={() => handleRejectRequest(rs.id)} disabled={isPending} className="p-1 rounded hover:bg-red-100 text-destructive">
                              <X className="size-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>}

        {/* ── Desktop: grid calendar ───────────────────────── */}
        {view === "month" && <div className="hidden md:block rounded-xl border overflow-hidden">
          <div className="grid grid-cols-7 bg-muted/50 border-b">
            {DAY_LABELS.map((label) => (
              <div key={label} className="py-1.5 text-center text-xs font-medium text-muted-foreground">
                {label}
              </div>
            ))}
          </div>

          {weeks.map((week, wi) => (
            <div key={wi} className={cn("grid grid-cols-7", wi < weeks.length - 1 && "border-b")}>
              {week.map((day) => {
                const dateObj = new Date(day.date + "T12:00:00")
                const dayNum = dateObj.getDate()
                const dow = String(dateObj.getDay())
                const bh = businessHours?.get(dow)
                const hasOpenHours = bh && !bh.isClosed && bh.openTime && bh.closeTime

                const openShiftBlocks = day.openShifts.map((os) => (
                  <div key={os.id} className="rounded border border-dashed border-muted-foreground/40 px-1 py-0.5 text-xs leading-tight bg-background">
                    <div className="flex items-center justify-between gap-0.5">
                      <span className="truncate text-muted-foreground font-medium text-[10px]">Voľná</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-0.5 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="size-2.5 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditRule({ id: os.id, ruleId: null, userId: "", userName: "", date: os.date, startTime: os.startTime, endTime: os.endTime, note: os.note, status: "open", color: "", isRule: false })}>Upraviť</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(os.id, false)} disabled={isPending}>Odstrániť</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="opacity-60 text-[9px]">{os.startTime}–{os.endTime}</div>
                    {os.claims.map((claim) => (
                      <div key={claim.claimId} className="flex items-center gap-0.5 mt-0.5">
                        <span className="truncate text-[9px] flex-1" style={{ color: claim.color }}>{claim.userName.split(" ")[0]} ⏳</span>
                        <button onClick={() => handleApprove(claim.claimId)} disabled={isPending} className="text-green-600 hover:opacity-70 disabled:opacity-30">
                          <Check className="size-2.5" />
                        </button>
                        <button onClick={() => handleReject(claim.claimId)} disabled={isPending} className="text-destructive hover:opacity-70 disabled:opacity-30">
                          <X className="size-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ))

                const requestedShiftBlocks = day.requestedShifts.map((rs) => (
                  <div key={rs.id} className="rounded border border-dashed border-amber-400/60 px-1 py-0.5 text-xs leading-tight bg-amber-50/50 dark:bg-amber-950/20">
                    <div className="truncate font-medium text-[10px]" style={{ color: rs.color }}>{rs.userName.split(" ")[0]} ⏳</div>
                    <div className="opacity-70 text-[9px] text-amber-600">{rs.startTime}–{rs.endTime}</div>
                    <div className="flex gap-0.5 mt-0.5">
                      <button onClick={() => handleApproveRequest(rs.id)} disabled={isPending} className="text-green-600 hover:opacity-70 disabled:opacity-30">
                        <Check className="size-2.5" />
                      </button>
                      <button onClick={() => handleRejectRequest(rs.id)} disabled={isPending} className="text-destructive hover:opacity-70 disabled:opacity-30">
                        <X className="size-2.5" />
                      </button>
                    </div>
                  </div>
                ))

                const shiftBlocks = day.shifts.map((shift) => (
                  <DropdownMenu key={shift.id}>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={cn(
                          "w-full text-left rounded px-1 py-0.5 text-xs leading-tight hover:opacity-80 transition-opacity",
                          shift.status === "draft" && "opacity-50",
                        )}
                        style={{
                          backgroundColor: shift.color + "28",
                          borderLeft: `2px ${shift.status === "draft" ? "dashed" : "solid"} ${shift.color}`,
                          color: shift.color,
                        }}
                      >
                        <div className="truncate font-medium">{shift.userName.split(" ")[0]}</div>
                        <div className="opacity-80">{shift.startTime}–{shift.endTime}</div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {!(shift.isRule && shift.status === "published") && (
                        <DropdownMenuItem onClick={() => openEditRule(shift)}>{shift.isRule ? "Upraviť pravidlo" : "Upraviť"}</DropdownMenuItem>
                      )}
                      {shift.status !== "open" && (
                        <DropdownMenuItem onClick={() => handleToggle(shift.id, shift.status as "draft" | "published", shift.isRule, shift.ruleId)} disabled={isPending}>
                          {shift.status === "draft" ? "Publikovať" : "Zrušiť publikovanie"}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {shift.isRule && (
                        <DropdownMenuItem onClick={() => handleSkipInstance(shift.ruleId!, shift.date)} disabled={isPending} className="text-destructive">Odstrániť túto zmenu</DropdownMenuItem>
                      )}
                      {!(shift.isRule && shift.status === "published") && (
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(shift.id, shift.isRule, shift.ruleId)} disabled={isPending}>
                          {shift.isRule ? "Odstrániť pravidlo" : "Odstrániť"}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ))

                return (
                  <div
                    key={day.date}
                    className={cn(
                      "min-h-20 p-1 border-r last:border-r-0 group",
                      !day.isCurrentMonth && "bg-muted/20",
                      day.isToday && "bg-primary/5",
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div
                        className={cn(
                          "text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full",
                          day.isToday
                            ? "bg-primary text-primary-foreground"
                            : day.isCurrentMonth
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {dayNum}
                      </div>
                      <button
                        onClick={() => openCreate(day.date)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
                      >
                        <Plus className="size-3 text-muted-foreground" />
                      </button>
                    </div>

                    {hasOpenHours ? (
                      <div
                        className="rounded-md border border-dashed border-muted-foreground/25 bg-muted/10 px-1 pt-0.5 pb-1 flex flex-col gap-0.5 min-h-10 cursor-pointer"
                        onClick={() => openCreate(day.date)}
                      >
                        <div className="text-[9px] text-muted-foreground/50 leading-none mb-0.5 select-none">
                          {bh.openTime!.slice(0, 5)}–{bh.closeTime!.slice(0, 5)}
                        </div>
                        <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
                          {shiftBlocks}
                          {openShiftBlocks}
                          {requestedShiftBlocks}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-0.5">{shiftBlocks}{openShiftBlocks}{requestedShiftBlocks}</div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>}

        {/* ── Week view ──────────────────────────────────── */}
        {view === "week" && (
          <div className="rounded-xl border overflow-hidden">
            <div className="grid grid-cols-7 bg-muted/50 border-b">
              {currentWeek.map((day) => {
                const dateObj = new Date(day.date + "T12:00:00")
                return (
                  <div key={day.date} className={cn("py-2 text-center border-r last:border-r-0", day.isToday && "bg-primary/10")}>
                    <div className="text-xs font-medium text-muted-foreground">{DAY_LABELS[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1]}</div>
                    <div className={cn("mx-auto mt-0.5 size-7 rounded-full flex items-center justify-center text-sm font-semibold", day.isToday ? "bg-primary text-primary-foreground" : "text-foreground")}>
                      {dateObj.getDate()}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="grid grid-cols-7 min-h-64">
              {currentWeek.map((day) => {
                const dow = String(new Date(day.date + "T12:00:00").getDay())
                const bh = businessHours?.get(dow)
                const hasOpenHours = bh && !bh.isClosed && bh.openTime && bh.closeTime
                return (
                  <div key={day.date}
                    className={cn("border-r last:border-r-0 p-1.5 flex flex-col gap-1 cursor-pointer", day.isToday && "bg-primary/5", !day.isCurrentMonth && "bg-muted/20")}
                    onClick={() => openCreate(day.date)}>
                    {hasOpenHours && (
                      <div className="text-[10px] text-muted-foreground/50 select-none">{bh.openTime!.slice(0, 5)}–{bh.closeTime!.slice(0, 5)}</div>
                    )}
                    <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                      {day.shifts.map((shift) => (
                        <DropdownMenu key={shift.id}>
                          <DropdownMenuTrigger asChild>
                            <button className={cn("w-full text-left rounded-lg px-2 py-1.5 text-xs hover:opacity-80 transition-opacity", shift.status === "draft" && "opacity-60")}
                              style={{ backgroundColor: shift.color + "28", borderLeft: `3px ${shift.status === "draft" ? "dashed" : "solid"} ${shift.color}`, color: shift.color }}>
                              <div className="font-semibold truncate">{shift.userName}</div>
                              <div className="opacity-80">{shift.startTime}–{shift.endTime}{shift.status === "draft" && " · koncept"}</div>
                              {shift.note && <div className="opacity-60 truncate mt-0.5">{shift.note}</div>}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {!(shift.isRule && shift.status === "published") && (
                              <DropdownMenuItem onClick={() => openEditRule(shift)}>{shift.isRule ? "Upraviť pravidlo" : "Upraviť"}</DropdownMenuItem>
                            )}
                            {shift.status !== "open" && (
                              <DropdownMenuItem onClick={() => handleToggle(shift.id, shift.status as "draft" | "published", shift.isRule, shift.ruleId)} disabled={isPending}>
                                {shift.status === "draft" ? "Publikovať" : "Zrušiť publikovanie"}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {shift.isRule && (
                              <DropdownMenuItem onClick={() => handleSkipInstance(shift.ruleId!, shift.date)} disabled={isPending} className="text-destructive">Odstrániť túto zmenu</DropdownMenuItem>
                            )}
                            {!(shift.isRule && shift.status === "published") && (
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(shift.id, shift.isRule, shift.ruleId)} disabled={isPending}>{shift.isRule ? "Odstrániť pravidlo" : "Odstrániť"}</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ))}
                      {day.openShifts.map((os) => (
                        <div key={os.id} className="rounded-lg border border-dashed border-muted-foreground/30 px-2 py-1.5 text-xs bg-muted/10">
                          <div className="font-medium text-muted-foreground">Voľná zmena</div>
                          <div className="text-muted-foreground/70">{os.startTime}–{os.endTime}</div>
                          {os.claims.map((claim) => (
                            <div key={claim.claimId} className="flex items-center justify-between gap-1 mt-1 rounded px-1.5 py-0.5" style={{ backgroundColor: claim.color + "18" }}>
                              <span className="text-xs font-medium truncate" style={{ color: claim.color }}>{claim.userName.split(" ")[0]} ⏳</span>
                              <div className="flex gap-0.5 shrink-0">
                                <button onClick={() => handleApprove(claim.claimId)} disabled={isPending} className="text-green-600 hover:opacity-70"><Check className="size-3" /></button>
                                <button onClick={() => handleReject(claim.claimId)} disabled={isPending} className="text-destructive hover:opacity-70"><X className="size-3" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                      {day.requestedShifts.map((rs) => (
                        <div key={rs.id} className="rounded-lg border border-dashed border-amber-400/60 px-2 py-1.5 text-xs bg-amber-50/50 dark:bg-amber-950/20">
                          <div className="font-medium truncate" style={{ color: rs.color }}>{rs.userName} — požiadavka</div>
                          <div className="text-muted-foreground">{rs.startTime}–{rs.endTime}</div>
                          <div className="flex gap-1 mt-1">
                            <button onClick={() => handleApproveRequest(rs.id)} disabled={isPending} className="text-green-600 hover:opacity-70"><Check className="size-3.5" /></button>
                            <button onClick={() => handleRejectRequest(rs.id)} disabled={isPending} className="text-destructive hover:opacity-70"><X className="size-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {!day.shifts.length && !day.openShifts.length && !day.requestedShifts.length && (
                      <div className="flex items-center justify-center text-muted-foreground/30 mt-2">
                        <Plus className="size-4" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <ShiftDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employees={employees}
        shift={editing}
        defaultDate={defaultDate}
      />
    </>
  )
}
