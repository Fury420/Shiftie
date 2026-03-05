"use client"

import { useState, useTransition } from "react"
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
import { ShiftDialog, type ShiftForEdit, type EmployeeOption } from "./shift-dialog"
import { deleteShift, toggleShiftStatus, publishDraftShifts } from "@/app/actions/schedule"

export interface AdminCalendarShift {
  id: string
  userId: string
  userName: string
  date: string
  startTime: string
  endTime: string
  note: string | null
  status: "draft" | "published"
  color: string
}

export interface AdminCalendarDay {
  date: string
  isCurrentMonth: boolean
  isToday: boolean
  shifts: AdminCalendarShift[]
  businessHours: { openTime: string; closeTime: string } | null
}

interface AdminMonthCalendarProps {
  weeks: AdminCalendarDay[][]
  employees: EmployeeOption[]
  monthLabel: string
  prevMonth: string
  nextMonth: string
}

const DAY_LABELS = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"]

export function AdminMonthCalendar({
  weeks,
  employees,
  monthLabel,
  prevMonth,
  nextMonth,
}: AdminMonthCalendarProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ShiftForEdit | undefined>()
  const [defaultDate, setDefaultDate] = useState<string | undefined>()
  const [isPending, startTransition] = useTransition()

  const allDraftIds = weeks.flatMap((week) =>
    week.flatMap((day) => day.shifts.filter((s) => s.status === "draft").map((s) => s.id)),
  )

  function openCreate(date?: string) {
    setEditing(undefined)
    setDefaultDate(date)
    setDialogOpen(true)
  }

  function openEdit(s: AdminCalendarShift) {
    setEditing({ id: s.id, userId: s.userId, date: s.date, startTime: s.startTime, endTime: s.endTime, note: s.note })
    setDefaultDate(undefined)
    setDialogOpen(true)
  }

  function handleDelete(id: string) {
    startTransition(() => deleteShift(id))
  }

  function handleToggle(id: string, status: "draft" | "published") {
    startTransition(() => toggleShiftStatus(id, status))
  }

  function handlePublishAll() {
    startTransition(() => publishDraftShifts(allDraftIds))
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" asChild>
              <Link href={`/admin/schedule?month=${prevMonth}`}>
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <span className="text-sm font-medium min-w-40 text-center capitalize">{monthLabel}</span>
            <Button variant="outline" size="icon" asChild>
              <Link href={`/admin/schedule?month=${nextMonth}`}>
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
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
          </div>
        </div>

        {/* ── Mobile: agenda list ─────────────────────────── */}
        <div className="md:hidden flex flex-col gap-2">
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

                {day.businessHours && (
                  <p className="text-xs text-muted-foreground pl-10">
                    Otvorené: {day.businessHours.openTime}–{day.businessHours.closeTime}
                  </p>
                )}

                {day.shifts.length === 0 ? (
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
                          <DropdownMenuItem onClick={() => openEdit(shift)}>Upraviť</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggle(shift.id, shift.status)} disabled={isPending}>
                            {shift.status === "draft" ? "Publikovať" : "Zrušiť publikovanie"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(shift.id)} disabled={isPending}>
                            Odstrániť
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ))}
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
                return (
                  <div
                    key={day.date}
                    className={cn(
                      "min-h-16 p-1 border-r last:border-r-0 group",
                      !day.isCurrentMonth && "bg-muted/20",
                      day.isToday && "bg-primary/5",
                    )}
                  >
                    <div className="flex items-center justify-between mb-0.5">
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

                    {day.businessHours && (
                      <p className="text-[10px] text-muted-foreground mb-0.5">
                        {day.businessHours.openTime}–{day.businessHours.closeTime}
                      </p>
                    )}

                    <div className="flex flex-col gap-0.5">
                      {day.shifts.map((shift) => (
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
                            <DropdownMenuItem onClick={() => openEdit(shift)}>
                              Upraviť
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggle(shift.id, shift.status)}
                              disabled={isPending}
                            >
                              {shift.status === "draft" ? "Publikovať" : "Zrušiť publikovanie"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(shift.id)}
                              disabled={isPending}
                            >
                              Odstrániť
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
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
