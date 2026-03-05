"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ChevronRight, UserPlus, UserMinus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LeaveRequestDialog } from "@/components/leaves/leave-request-dialog"
import type { ColleagueOption } from "@/components/shift-replacement/request-dialog"
import { claimShiftBlock, unclaimShift } from "@/app/actions/schedule"

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

export interface CalendarDay {
  date: string
  isCurrentMonth: boolean
  isToday: boolean
  shifts: CalendarShift[]
  businessHours: { openTime: string; closeTime: string } | null
}

interface MonthCalendarProps {
  weeks: CalendarDay[][]
  monthLabel: string
  prevMonth: string
  nextMonth: string
  allEmployees: ColleagueOption[]
}

interface LeaveContext {
  date: string
  shiftId?: string
  shiftLabel?: string
  colleagues?: ColleagueOption[]
}

const DAY_LABELS = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"]

export function MonthCalendar({ weeks, monthLabel, prevMonth, nextMonth, allEmployees }: MonthCalendarProps) {
  const [leaveCtx, setLeaveCtx] = useState<LeaveContext | null>(null)
  const [pendingClaim, setPendingClaim] = useState<string | null>(null)
  const [pendingUnclaim, setPendingUnclaim] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function openLeave(day: CalendarDay, shift: CalendarShift) {
    setLeaveCtx({
      date: day.date,
      shiftId: shift.id,
      shiftLabel: `${shift.startTime}–${shift.endTime}`,
      colleagues: allEmployees.filter((e) => e.id !== shift.userId),
    })
  }

  function handleClaim(date: string) {
    setError(null)
    setPendingClaim(date)
    startTransition(async () => {
      try {
        await claimShiftBlock(date)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chyba")
      } finally {
        setPendingClaim(null)
      }
    })
  }

  function handleUnclaim(shiftId: string) {
    setError(null)
    setPendingUnclaim(shiftId)
    startTransition(async () => {
      try {
        await unclaimShift(shiftId)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chyba")
      } finally {
        setPendingUnclaim(null)
      }
    })
  }

  const todayStr = new Date().toISOString().slice(0, 10)

  return (
      <div className="flex flex-col gap-4">
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
        )}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Plán zmien</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/schedule?month=${prevMonth}`}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <span className="text-sm font-medium min-w-40 text-center capitalize">{monthLabel}</span>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/schedule?month=${nextMonth}`}>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Mobile: agenda list ─────────────────────────── */}
      <div className="md:hidden flex flex-col gap-2">
        {weeks.flat().filter((d) => d.isCurrentMonth).map((day) => {
          const dateObj = new Date(day.date + "T12:00:00")
          const dayLabel = dateObj.toLocaleDateString("sk-SK", { weekday: "long", day: "numeric", month: "numeric" })
          const isPast = day.date < todayStr
          const hasMyShift = day.shifts.some((s) => s.isCurrentUser)
          const myShift = day.shifts.find((s) => s.isCurrentUser)
          const canClaim = day.businessHours && !hasMyShift && !isPast
          return (
            <div
              key={day.date}
              className={cn(
                "rounded-xl border p-3 flex flex-col gap-2",
                day.isToday && "border-primary/40 bg-primary/5",
                !day.isToday && day.shifts.length === 0 && !canClaim && "opacity-50",
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "size-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                    day.isToday ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {dateObj.getDate()}
                </div>
                <span className={cn("text-sm font-medium capitalize", !day.isCurrentMonth && "text-muted-foreground")}>
                  {dayLabel}
                </span>
              </div>

              {day.businessHours && (
                <p className="text-xs text-muted-foreground pl-10">
                  Otvorené: {day.businessHours.openTime}–{day.businessHours.closeTime}
                </p>
              )}

              {canClaim && (
                <div className="pl-10">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    disabled={isPending && pendingClaim === day.date}
                    onClick={() => handleClaim(day.date)}
                  >
                    {pendingClaim === day.date ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="size-3.5" />
                        Zapísať sa
                      </>
                    )}
                  </Button>
                </div>
              )}

              {day.shifts.length === 0 && !canClaim ? (
                <p className="text-xs text-muted-foreground pl-10">Žiadne zmeny</p>
              ) : (
                <div className="flex flex-col gap-1.5 pl-10">
                  {day.shifts.map((shift) => {
                    const clickable = shift.isCurrentUser && !isPast
                    const baseStyle = { backgroundColor: shift.color + "28", borderLeft: `3px solid ${shift.color}` }
                    return (
                      <div
                        key={shift.id}
                        className={cn("rounded-lg px-3 py-2 transition-opacity", clickable && "cursor-pointer hover:opacity-80")}
                        style={baseStyle}
                        onClick={!shift.isCurrentUser ? undefined : clickable ? () => openLeave(day, shift) : undefined}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold" style={{ color: shift.color }}>
                              {shift.userName.split(" ")[0]}
                            </div>
                            <div className="text-xs opacity-75" style={{ color: shift.color }}>
                              {shift.startTime}–{shift.endTime}
                            </div>
                          </div>
                          {shift.isCurrentUser && !isPast && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive shrink-0"
                              disabled={isPending && pendingUnclaim === shift.id}
                              onClick={(e) => { e.stopPropagation(); handleUnclaim(shift.id) }}
                            >
                              {pendingUnclaim === shift.id ? <Loader2 className="size-3 animate-spin" /> : "Zrušiť"}
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Desktop: grid calendar ───────────────────────── */}
      <div className="hidden md:block rounded-xl border overflow-hidden">
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
              const dayNum = new Date(day.date + "T12:00:00").getDate()
              const isPast = day.date < todayStr
              const hasMyShift = day.shifts.some((s) => s.isCurrentUser)
              const canClaim = day.businessHours && !hasMyShift && !isPast
              return (
                <div
                  key={day.date}
                  className={cn(
                    "min-h-16 p-1 border-r last:border-r-0",
                    !day.isCurrentMonth && "bg-muted/20",
                    day.isToday && "bg-primary/5",
                  )}
                >
                  <div
                    className={cn(
                      "text-xs font-medium mb-0.5 w-5 h-5 flex items-center justify-center rounded-full",
                      day.isToday
                        ? "bg-primary text-primary-foreground"
                        : day.isCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {dayNum}
                  </div>

                  {day.businessHours && (
                    <p className="text-[10px] text-muted-foreground mb-0.5">
                      {day.businessHours.openTime}–{day.businessHours.closeTime}
                    </p>
                  )}

                  {canClaim && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-6 text-[10px] px-1 mb-0.5"
                      disabled={isPending && pendingClaim === day.date}
                      onClick={() => handleClaim(day.date)}
                    >
                      {pendingClaim === day.date ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        "Zapísať sa"
                      )}
                    </Button>
                  )}

                  <div className="flex flex-col gap-0.5">
                    {day.shifts.map((shift) => {
                      const shiftClickable = shift.isCurrentUser && !isPast
                      const baseStyle = {
                        backgroundColor: shift.color + "28",
                        borderLeft: `3px solid ${shift.color}`,
                        color: shift.color,
                      }
                      return (
                        <div
                          key={shift.id}
                          className={cn(
                            "rounded px-1.5 py-0.5 text-xs leading-tight",
                            shiftClickable && "font-semibold cursor-pointer hover:opacity-75 transition-opacity",
                          )}
                          style={baseStyle}
                          onClick={shiftClickable ? () => openLeave(day, shift) : undefined}
                        >
                          <div className="flex items-center justify-between gap-0.5">
                            <div className="truncate min-w-0">
                              <div className="truncate">{shift.userName.split(" ")[0]}</div>
                              <div className="opacity-80">{shift.startTime}–{shift.endTime}</div>
                            </div>
                            {shift.isCurrentUser && !isPast && (
                              <button
                                type="button"
                                className="shrink-0 text-[10px] text-muted-foreground hover:text-destructive"
                                disabled={isPending && pendingUnclaim === shift.id}
                                onClick={(e) => { e.stopPropagation(); handleUnclaim(shift.id) }}
                              >
                                {pendingUnclaim === shift.id ? "…" : "×"}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <LeaveRequestDialog
        open={!!leaveCtx}
        onOpenChange={(open) => { if (!open) setLeaveCtx(null) }}
        defaultDate={leaveCtx?.date}
        shiftId={leaveCtx?.shiftId}
        shiftLabel={leaveCtx?.shiftLabel}
        colleagues={leaveCtx?.colleagues}
      />
    </div>
  )
}
