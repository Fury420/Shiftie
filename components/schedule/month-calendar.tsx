"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LeaveRequestDialog } from "@/components/leaves/leave-request-dialog"
import type { ColleagueOption } from "@/components/shift-replacement/request-dialog"
import { claimShift } from "@/app/actions/schedule"
import { toast } from "sonner"
import { RequestShiftDialog } from "./request-shift-dialog"

export interface CalendarShift {
  id: string
  userId: string
  userName: string
  startTime: string
  endTime: string
  note: string | null
  color: string
  isCurrentUser: boolean
  canRequest: boolean
}

export interface OpenShift {
  id: string
  startTime: string
  endTime: string
  note: string | null
  claimedByUsers: { userId: string; userName: string; color: string; claimId: string }[]
  myClaimId: string | null
  iMayClaim: boolean
}

export interface RequestedShift {
  id: string
  startTime: string
  endTime: string
  note: string | null
}

export interface CalendarDay {
  date: string
  isCurrentMonth: boolean
  isToday: boolean
  shifts: CalendarShift[]
  openShifts: OpenShift[]
  requestedShifts: RequestedShift[]
}

export interface BusinessHoursEntry {
  dayOfWeek: string
  isClosed: boolean
  openTime: string | null
  closeTime: string | null
}

interface MonthCalendarProps {
  weeks: CalendarDay[][]
  monthLabel: string
  prevMonth: string
  nextMonth: string
  allEmployees: ColleagueOption[]
  businessHours?: Map<string, BusinessHoursEntry>
  currentUserId?: string
}

interface LeaveContext {
  date: string
  shiftId?: string
  shiftLabel?: string
  colleagues?: ColleagueOption[]
}

const DAY_LABELS = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"]

export function MonthCalendar({ weeks, monthLabel, prevMonth, nextMonth, allEmployees, businessHours, currentUserId }: MonthCalendarProps) {
  const router = useRouter()
  const [view, setView] = useState<"month" | "week">("month")
  const [weekIdx, setWeekIdx] = useState(() => {
    const today = new Date().toISOString().slice(0, 10)
    const idx = weeks.findIndex((w) => w.some((d) => d.date === today))
    return idx >= 0 ? idx : weeks.findIndex((w) => w.some((d) => d.isCurrentMonth)) ?? 0
  })
  const [leaveCtx, setLeaveCtx] = useState<LeaveContext | null>(null)
  const [requestDate, setRequestDate] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const currentWeek = weeks[weekIdx] ?? weeks[0]
  const weekStart = currentWeek[0]
  const weekEnd = currentWeek[6]
  const weekLabel = (() => {
    const s = new Date(weekStart.date + "T12:00:00")
    const e = new Date(weekEnd.date + "T12:00:00")
    const fmt = (d: Date) => d.toLocaleDateString("sk-SK", { day: "numeric", month: "numeric" })
    return `${fmt(s)} – ${fmt(e)}`
  })()

  function handleClaim(shiftId: string) {
    startTransition(async () => {
      try {
        await claimShift(shiftId)
        toast.success("Prihlásenie odoslané — čaká na schválenie")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Chyba pri prihlasovaní")
      }
    })
  }

  function openLeave(day: CalendarDay, shift: CalendarShift) {
    setLeaveCtx({
      date: day.date,
      shiftId: shift.id,
      shiftLabel: `${shift.startTime}–${shift.endTime}`,
      colleagues: allEmployees.filter((e) => e.id !== shift.userId),
    })
  }

  function handlePrevWeek() {
    if (weekIdx > 0) setWeekIdx(weekIdx - 1)
    else router.push(`/schedule?month=${prevMonth}`)
  }

  function handleNextWeek() {
    if (weekIdx < weeks.length - 1) setWeekIdx(weekIdx + 1)
    else router.push(`/schedule?month=${nextMonth}`)
  }

  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2">
        {view === "month" ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" asChild>
              <Link href={`/schedule?month=${prevMonth}`}><ChevronLeft className="size-4" /></Link>
            </Button>
            <span className="text-sm font-medium min-w-40 text-center capitalize">{monthLabel}</span>
            <Button variant="outline" size="icon" asChild>
              <Link href={`/schedule?month=${nextMonth}`}><ChevronRight className="size-4" /></Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevWeek}><ChevronLeft className="size-4" /></Button>
            <span className="text-sm font-medium min-w-40 text-center">{weekLabel}</span>
            <Button variant="outline" size="icon" onClick={handleNextWeek}><ChevronRight className="size-4" /></Button>
          </div>
        )}

        <div className="flex rounded-md border p-0.5 gap-0.5">
          <Button
            variant={view === "month" ? "secondary" : "ghost"}
            size="sm" className="h-7 px-3 text-xs"
            onClick={() => setView("month")}
          >
            Mesiac
          </Button>
          <Button
            variant={view === "week" ? "secondary" : "ghost"}
            size="sm" className="h-7 px-3 text-xs"
            onClick={() => setView("week")}
          >
            Týždeň
          </Button>
        </div>
      </div>

      {/* ── Mobile: agenda list ─────────────────────────── */}
      {view === "month" && (
        <div className="md:hidden flex flex-col gap-2">
          {weeks.flat().filter((d) => d.isCurrentMonth).map((day) => {
            const dateObj = new Date(day.date + "T12:00:00")
            const dayLabel = dateObj.toLocaleDateString("sk-SK", { weekday: "long", day: "numeric", month: "numeric" })
            const isPast = day.date < todayStr
            return (
              <div
                key={day.date}
                className={cn(
                  "rounded-xl border p-3 flex flex-col gap-2",
                  day.isToday && "border-primary/40 bg-primary/5",
                  !day.isToday && day.shifts.length === 0 && day.openShifts.length === 0 && day.requestedShifts.length === 0 && "opacity-50",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("size-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0", day.isToday ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      {dateObj.getDate()}
                    </div>
                    <span className={cn("text-sm font-medium capitalize", !day.isCurrentMonth && "text-muted-foreground")}>{dayLabel}</span>
                  </div>
                  {!isPast && (
                    <button onClick={() => setRequestDate(day.date)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground" title="Požiadať o zmenu">
                      <Plus className="size-4" />
                    </button>
                  )}
                </div>
                {day.shifts.length === 0 && day.openShifts.length === 0 && day.requestedShifts.length === 0 ? (
                  <p className="text-xs text-muted-foreground pl-10">Žiadne zmeny</p>
                ) : (
                  <div className="flex flex-col gap-1.5 pl-10">
                    {day.shifts.map((shift) => {
                      const clickable = shift.isCurrentUser && !isPast
                      return (
                        <div key={shift.id} className={cn("rounded-lg px-3 py-2 transition-opacity", clickable && "cursor-pointer hover:opacity-80")}
                          style={{ backgroundColor: shift.color + "28", borderLeft: `3px solid ${shift.color}` }}
                          onClick={clickable ? () => openLeave(day, shift) : undefined}>
                          <div className="text-sm font-semibold" style={{ color: shift.color }}>{shift.userName.split(" ")[0]}</div>
                          <div className="text-xs opacity-75" style={{ color: shift.color }}>{shift.startTime}–{shift.endTime}</div>
                        </div>
                      )
                    })}
                    {day.requestedShifts.map((rs) => (
                      <div key={rs.id} className="rounded-lg border border-dashed border-amber-400/60 px-3 py-2 bg-amber-50/50 dark:bg-amber-950/20">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Moja požiadavka</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="size-3" /> Čaká</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{rs.startTime}–{rs.endTime}</div>
                      </div>
                    ))}
                    {day.openShifts.map((os) => (
                      <div key={os.id}
                        className={cn("rounded-lg border border-dashed border-muted-foreground/30 px-3 py-2 flex flex-col gap-1 bg-muted/10", os.iMayClaim && !isPast && "cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors")}
                        onClick={os.iMayClaim && !isPast ? () => handleClaim(os.id) : undefined}>
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-muted-foreground">Voľná zmena</div>
                          {os.iMayClaim && !isPast && <span className="text-xs font-medium text-primary">Prihlásiť sa</span>}
                          {os.myClaimId && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="size-3" /> Čaká</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">{os.startTime}–{os.endTime}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Desktop month grid ───────────────────────── */}
      {view === "month" && (
        <div className="hidden md:block rounded-xl border overflow-hidden">
          <div className="grid grid-cols-7 bg-muted/50 border-b">
            {DAY_LABELS.map((label) => (
              <div key={label} className="py-1.5 text-center text-xs font-medium text-muted-foreground">{label}</div>
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
                const isPast = day.date < todayStr
                const shiftBlocks = (
                  <>
                    {day.shifts.map((shift) => {
                      const clickable = shift.isCurrentUser && !isPast
                      return (
                        <div key={shift.id}
                          className={cn("rounded px-1.5 py-0.5 text-xs leading-tight", clickable && "font-semibold cursor-pointer hover:opacity-75 transition-opacity")}
                          style={{ backgroundColor: shift.color + "28", borderLeft: `3px solid ${shift.color}`, color: shift.color }}
                          onClick={clickable ? () => openLeave(day, shift) : undefined}>
                          <div className="truncate">{shift.userName.split(" ")[0]}</div>
                          <div className="opacity-80">{shift.startTime}–{shift.endTime}</div>
                        </div>
                      )
                    })}
                    {day.requestedShifts.map((rs) => (
                      <div key={rs.id} className="rounded border border-dashed border-amber-400/60 px-1.5 py-0.5 text-xs leading-tight bg-amber-50/50 dark:bg-amber-950/20">
                        <div className="truncate text-amber-700 dark:text-amber-400 font-medium">Požiadavka</div>
                        <div className="opacity-70 text-amber-600">{rs.startTime}–{rs.endTime}</div>
                      </div>
                    ))}
                    {day.openShifts.map((os) => (
                      <div key={os.id}
                        className={cn("rounded border border-dashed border-muted-foreground/40 px-1.5 py-0.5 text-xs leading-tight bg-background", os.iMayClaim && !isPast && "cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors")}
                        onClick={os.iMayClaim && !isPast ? () => handleClaim(os.id) : undefined}>
                        <div className="flex items-center justify-between gap-0.5">
                          <span className="truncate text-muted-foreground font-medium">Voľná</span>
                          {os.myClaimId && <Clock className="size-2.5 text-muted-foreground shrink-0" />}
                        </div>
                        <div className="opacity-60">{os.startTime}–{os.endTime}</div>
                      </div>
                    ))}
                  </>
                )
                const canRequest = !isPast && day.isCurrentMonth
                return (
                  <div key={day.date} className={cn("min-h-20 p-1 border-r last:border-r-0", !day.isCurrentMonth && "bg-muted/20", day.isToday && "bg-primary/5")}>
                    <div className="flex items-center justify-between mb-1 group/day">
                      <div className={cn("text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full", day.isToday ? "bg-primary text-primary-foreground" : day.isCurrentMonth ? "text-foreground" : "text-muted-foreground")}>
                        {dayNum}
                      </div>
                      {!isPast && day.isCurrentMonth && (
                        <button onClick={() => setRequestDate(day.date)} className="opacity-0 group-hover/day:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted" title="Požiadať o zmenu">
                          <Plus className="size-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                    {hasOpenHours ? (
                      <div className={cn("rounded-md border border-dashed border-muted-foreground/25 bg-muted/10 px-1 pt-0.5 pb-1 flex flex-col gap-0.5 min-h-10", canRequest && "cursor-pointer")}
                        onClick={canRequest ? () => setRequestDate(day.date) : undefined}>
                        <div className="text-[9px] text-muted-foreground/50 leading-none mb-0.5 select-none">{bh.openTime!.slice(0, 5)}–{bh.closeTime!.slice(0, 5)}</div>
                        <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>{shiftBlocks}</div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-0.5">{shiftBlocks}</div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

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
              const isPast = day.date < todayStr
              const dow = String(new Date(day.date + "T12:00:00").getDay())
              const bh = businessHours?.get(dow)
              const hasOpenHours = bh && !bh.isClosed && bh.openTime && bh.closeTime
              const canRequest = !isPast && day.isCurrentMonth
              const empty = day.shifts.length === 0 && day.openShifts.length === 0 && day.requestedShifts.length === 0
              return (
                <div key={day.date} className={cn("border-r last:border-r-0 p-1.5 flex flex-col gap-1", day.isToday && "bg-primary/5", !day.isCurrentMonth && "bg-muted/20")}>
                  {hasOpenHours && (
                    <div className={cn("text-[10px] text-muted-foreground/50 select-none", canRequest && "cursor-pointer")}
                      onClick={canRequest ? () => setRequestDate(day.date) : undefined}>
                      {bh.openTime!.slice(0, 5)}–{bh.closeTime!.slice(0, 5)}
                    </div>
                  )}
                  {empty && canRequest && (
                    <button onClick={() => setRequestDate(day.date)}
                      className="flex items-center justify-center gap-1 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors rounded p-1 hover:bg-muted w-full">
                      <Plus className="size-3" />
                    </button>
                  )}
                  {day.shifts.map((shift) => {
                    const clickable = shift.isCurrentUser && !isPast
                    return (
                      <div key={shift.id}
                        className={cn("rounded-lg px-2 py-1.5 text-xs", clickable && "cursor-pointer hover:opacity-80 transition-opacity")}
                        style={{ backgroundColor: shift.color + "28", borderLeft: `3px solid ${shift.color}`, color: shift.color }}
                        onClick={clickable ? () => openLeave(day, shift) : undefined}>
                        <div className="font-semibold truncate">{shift.userName}</div>
                        <div className="opacity-80">{shift.startTime}–{shift.endTime}</div>
                        {shift.note && <div className="opacity-60 truncate mt-0.5">{shift.note}</div>}
                      </div>
                    )
                  })}
                  {day.requestedShifts.map((rs) => (
                    <div key={rs.id} className="rounded-lg border border-dashed border-amber-400/60 px-2 py-1.5 text-xs bg-amber-50/50 dark:bg-amber-950/20">
                      <div className="font-medium text-amber-700 dark:text-amber-400">Moja požiadavka</div>
                      <div className="text-muted-foreground">{rs.startTime}–{rs.endTime}</div>
                    </div>
                  ))}
                  {day.openShifts.map((os) => (
                    <div key={os.id}
                      className={cn("rounded-lg border border-dashed border-muted-foreground/40 px-2 py-1.5 text-xs bg-muted/10", os.iMayClaim && !isPast && "cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors")}
                      onClick={os.iMayClaim && !isPast ? () => handleClaim(os.id) : undefined}>
                      <div className="font-medium text-muted-foreground">Voľná zmena</div>
                      <div className="text-muted-foreground/70">{os.startTime}–{os.endTime}</div>
                      {os.iMayClaim && !isPast && <div className="text-primary font-medium mt-0.5">Prihlásiť sa</div>}
                      {os.myClaimId && <div className="text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="size-3" /> Čaká</div>}
                    </div>
                  ))}
                  {!empty && canRequest && (
                    <button onClick={() => setRequestDate(day.date)}
                      className="mt-auto flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground transition-colors rounded p-0.5 hover:bg-muted">
                      <Plus className="size-3" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <LeaveRequestDialog
        open={!!leaveCtx}
        onOpenChange={(open) => { if (!open) setLeaveCtx(null) }}
        defaultDate={leaveCtx?.date}
        shiftId={leaveCtx?.shiftId}
        shiftLabel={leaveCtx?.shiftLabel}
        colleagues={leaveCtx?.colleagues}
      />
      <RequestShiftDialog
        open={!!requestDate}
        onOpenChange={(open) => { if (!open) setRequestDate(null) }}
        date={requestDate ?? ""}
      />
    </div>
  )
}
