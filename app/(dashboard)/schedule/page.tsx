export const dynamic = "force-dynamic"

import { db } from "@/db"
import { shifts, user, leaves } from "@/db/schema"
import { eq, and, gte, lte, asc } from "drizzle-orm"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { MonthCalendar, type CalendarDay, type CalendarShift } from "@/components/schedule/month-calendar"
import { getMonthGrid, toDateStr, formatMonthLabel, shortTime } from "@/lib/week"

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const session = await getSession()
  if (!session) redirect("/login")

  const sessionUser = session.user as { role?: string; organizationId?: string | null }
  const isAdmin = sessionUser.role === "admin"
  const orgId = sessionUser.organizationId!

  const { month } = await searchParams
  const { year, monthNum, weeks } = getMonthGrid(month)

  const startDate = toDateStr(weeks[0][0])
  const endDate = toDateStr(weeks[weeks.length - 1][6])
  const todayStr = toDateStr(new Date())

  const [monthShifts, employees, approvedLeaves] = await Promise.all([
    db
      .select({
        id: shifts.id,
        userId: shifts.userId,
        date: shifts.date,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        note: shifts.note,
      })
      .from(shifts)
      .where(
        and(
          eq(shifts.organizationId, orgId),
          eq(shifts.status, "published"),
          gte(shifts.date, startDate),
          lte(shifts.date, endDate),
        ),
      )
      .orderBy(asc(shifts.startTime)),

    db
      .select({ id: user.id, name: user.name, color: user.color })
      .from(user)
      .where(eq(user.organizationId, orgId))
      .orderBy(asc(user.name)),

    db
      .select({ userId: leaves.userId, startDate: leaves.startDate, endDate: leaves.endDate })
      .from(leaves)
      .where(and(eq(leaves.organizationId, orgId), eq(leaves.status, "approved"), lte(leaves.startDate, endDate), gte(leaves.endDate, startDate))),
  ])

  const onLeave = (userId: string, date: string) =>
    approvedLeaves.some((l) => l.userId === userId && l.startDate <= date && l.endDate >= date)

  const visibleShifts = monthShifts.filter((s) => !onLeave(s.userId, s.date))

  const colorMap = new Map(
    employees.map((e) => ({ id: e.id, name: e.name, color: e.color ?? "#6b7280" }))
      .map((e) => [e.id, e]),
  )

  const calendarWeeks: CalendarDay[][] = weeks.map((week) =>
    week.map((date) => {
      const dateStr = toDateStr(date)
      const dayShifts: CalendarShift[] = visibleShifts
        .filter((s) => s.date === dateStr)
        .map((s) => {
          const emp = colorMap.get(s.userId)
          return {
            id: s.id,
            userId: s.userId,
            userName: emp?.name ?? "—",
            startTime: shortTime(s.startTime),
            endTime: shortTime(s.endTime),
            note: s.note,
            color: emp?.color ?? "#6b7280",
            isCurrentUser: s.userId === session.user.id,
            canRequest: isAdmin || s.userId === session.user.id,
          }
        })

      return {
        date: dateStr,
        isCurrentMonth: date.getMonth() === monthNum - 1,
        isToday: dateStr === todayStr,
        shifts: dayShifts,
      }
    }),
  )

  const prevMonth =
    monthNum === 1
      ? `${year - 1}-12`
      : `${year}-${String(monthNum - 1).padStart(2, "0")}`
  const nextMonth =
    monthNum === 12
      ? `${year + 1}-01`
      : `${year}-${String(monthNum + 1).padStart(2, "0")}`

  return (
    <MonthCalendar
      weeks={calendarWeeks}
      monthLabel={formatMonthLabel(year, monthNum)}
      prevMonth={prevMonth}
      nextMonth={nextMonth}
      allEmployees={employees.map((e) => ({ id: e.id, name: e.name }))}
    />
  )
}
