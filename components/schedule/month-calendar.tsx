"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RequestDialog, type ColleagueOption } from "@/components/shift-replacement/request-dialog"

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
}

interface MonthCalendarProps {
  weeks: CalendarDay[][]
  monthLabel: string
  prevMonth: string
  nextMonth: string
  allEmployees: ColleagueOption[]
}

const DAY_LABELS = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"]

export function MonthCalendar({ weeks, monthLabel, prevMonth, nextMonth, allEmployees }: MonthCalendarProps) {
  const [dialogShift, setDialogShift] = useState<CalendarShift & { dateLabel: string } | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Plán smien</h1>
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
          const isPast = day.date < new Date().toISOString().slice(0, 10)
          return (
            <div
              key={day.date}
              className={cn(
                "rounded-xl border p-3 flex flex-col gap-2",
                day.isToday && "border-primary/40 bg-primary/5",
                !day.isToday && day.shifts.length === 0 && "opacity-50",
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

              {day.shifts.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-10">Žiadne smeny</p>
              ) : (
                <div className="flex flex-col gap-1.5 pl-10">
                  {day.shifts.map((shift) => {
                    return shift.canRequest && !isPast ? (
                      <DropdownMenu key={shift.id}>
                        <DropdownMenuTrigger asChild>
                          <div
                            className="rounded-lg px-3 py-2 cursor-pointer hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: shift.color + "28", borderLeft: `3px solid ${shift.color}` }}
                          >
                            <div className="text-sm font-semibold" style={{ color: shift.color }}>
                              {shift.userName.split(" ")[0]}
                            </div>
                            <div className="text-xs opacity-75" style={{ color: shift.color }}>
                              {shift.startTime}–{shift.endTime}
                            </div>
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="bottom" align="start" className="w-44">
                          <DropdownMenuItem onSelect={() => setDialogShift({ ...shift, dateLabel: day.date })}>
                            <ArrowLeftRight className="size-4" />
                            Požiadať o zastup
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <div
                        key={shift.id}
                        className="rounded-lg px-3 py-2"
                        style={{ backgroundColor: shift.color + "28", borderLeft: `3px solid ${shift.color}` }}
                      >
                        <div className="text-sm font-semibold" style={{ color: shift.color }}>
                          {shift.userName.split(" ")[0]}
                        </div>
                        <div className="text-xs opacity-75" style={{ color: shift.color }}>
                          {shift.startTime}–{shift.endTime}
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
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-muted/50 border-b">
          {DAY_LABELS.map((label) => (
            <div
              key={label}
              className="py-1.5 text-center text-xs font-medium text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className={cn("grid grid-cols-7", wi < weeks.length - 1 && "border-b")}>
            {week.map((day) => {
              const dayNum = new Date(day.date + "T12:00:00").getDate()
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

                  <div className="flex flex-col gap-0.5">
                    {day.shifts.map((shift) => {
                      const isPast = day.date < new Date().toISOString().slice(0, 10)
                      return shift.canRequest && !isPast ? (
                        <DropdownMenu key={shift.id}>
                          <DropdownMenuTrigger asChild>
                            <div
                              className="rounded px-1.5 py-0.5 text-xs leading-tight font-semibold cursor-pointer hover:opacity-75 transition-opacity"
                              style={{
                                backgroundColor: shift.color + "28",
                                borderLeft: `3px solid ${shift.color}`,
                                color: shift.color,
                              }}
                            >
                              <div className="truncate">{shift.userName.split(" ")[0]}</div>
                              <div className="opacity-80">{shift.startTime}–{shift.endTime}</div>
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="bottom" align="start" className="w-44">
                            <DropdownMenuItem
                              onSelect={() => setDialogShift({ ...shift, dateLabel: day.date })}
                            >
                              <ArrowLeftRight className="size-4" />
                              Požiadať o zastup
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <div
                          key={shift.id}
                          className="rounded px-1.5 py-0.5 text-xs leading-tight"
                          style={{
                            backgroundColor: shift.color + "28",
                            borderLeft: `3px solid ${shift.color}`,
                            color: shift.color,
                          }}
                        >
                          <div className="truncate">{shift.userName.split(" ")[0]}</div>
                          <div className="opacity-80">{shift.startTime}–{shift.endTime}</div>
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

      {dialogShift && (
        <RequestDialog
          open={!!dialogShift}
          onOpenChange={(open) => { if (!open) setDialogShift(null) }}
          shift={{
            id: dialogShift.id,
            date: dialogShift.dateLabel,
            startTime: dialogShift.startTime,
            endTime: dialogShift.endTime,
          }}
          colleagues={allEmployees.filter((e) => e.id !== dialogShift.userId)}
        />
      )}
    </div>
  )
}
