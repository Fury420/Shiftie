export const dynamic = "force-dynamic"

import { db } from "@/db"
import { shifts, user, businessHours, openShiftClaims } from "@/db/schema"
import { eq, and, gte, lte, asc } from "drizzle-orm"
import { requireAdmin } from "@/lib/auth-guard"
import { AdminMonthCalendar, type AdminCalendarDay, type AdminCalendarShift, type AdminOpenShift, type AdminRequestedShift } from "@/components/schedule/admin-month-calendar"
import { getMonthGrid, toDateStr, formatMonthLabel, shortTime } from "@/lib/week"

export default async function AdminSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const session = await requireAdmin()
  const orgId = (session.user as { organizationId?: string | null }).organizationId!

  const { month } = await searchParams
  const { year, monthNum, weeks } = getMonthGrid(month)

  const startDate = toDateStr(weeks[0][0])
  const endDate = toDateStr(weeks[weeks.length - 1][6])
  const todayStr = toDateStr(new Date())
  const monthStr = `${year}-${String(monthNum).padStart(2, "0")}`
  const firstOfMonth = `${monthStr}-01`
  const lastOfMonth = toDateStr(new Date(year, monthNum, 0, 12, 0, 0))

  const [monthShifts, requestedShifts, pendingClaims, employees, orgBusinessHours] = await Promise.all([
    db
      .select({
        id: shifts.id,
        userId: shifts.userId,
        date: shifts.date,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        note: shifts.note,
        status: shifts.status,
      })
      .from(shifts)
      .where(and(eq(shifts.organizationId, orgId), gte(shifts.date, startDate), lte(shifts.date, endDate)))
      .orderBy(asc(shifts.startTime)),

    db
      .select({ id: shifts.id, userId: shifts.userId, date: shifts.date, startTime: shifts.startTime, endTime: shifts.endTime, note: shifts.note })
      .from(shifts)
      .where(and(eq(shifts.organizationId, orgId), eq(shifts.status, "requested"), gte(shifts.date, startDate), lte(shifts.date, endDate)))
      .orderBy(asc(shifts.startTime)),

    db
      .select({
        id: openShiftClaims.id,
        shiftId: openShiftClaims.shiftId,
        claimedByUserId: openShiftClaims.claimedByUserId,
        status: openShiftClaims.status,
      })
      .from(openShiftClaims)
      .where(and(eq(openShiftClaims.organizationId, orgId), eq(openShiftClaims.status, "pending"))),

    db
      .select({
        id: user.id,
        name: user.name,
        color: user.color,
        archivedAt: user.archivedAt,
        defaultDays: user.defaultDays,
        defaultStartTime: user.defaultStartTime,
        defaultEndTime: user.defaultEndTime,
      })
      .from(user)
      .where(eq(user.organizationId, orgId))
      .orderBy(asc(user.name)),

    db
      .select()
      .from(businessHours)
      .where(eq(businessHours.organizationId, orgId)),
  ])

  const colorMap = new Map(employees.map((e) => [e.id, { name: e.name, color: e.color ?? "#6b7280" }]))

  const calendarWeeks: AdminCalendarDay[][] = weeks.map((week) =>
    week.map((date) => {
      const dateStr = toDateStr(date)
      const dayShifts: AdminCalendarShift[] = monthShifts
        .filter((s) => s.date === dateStr && s.status !== "open")
        .map((s) => {
          const emp = s.userId ? colorMap.get(s.userId) : undefined
          return {
            id: s.id,
            userId: s.userId ?? "",
            userName: emp?.name ?? "—",
            date: dateStr,
            startTime: shortTime(s.startTime),
            endTime: shortTime(s.endTime),
            note: s.note,
            status: s.status,
            color: emp?.color ?? "#6b7280",
          }
        })

      const dayRequestedShifts: AdminRequestedShift[] = requestedShifts
        .filter((s) => s.date === dateStr)
        .map((s) => {
          const emp = s.userId ? colorMap.get(s.userId) : undefined
          return {
            id: s.id,
            userId: s.userId ?? "",
            userName: emp?.name ?? "—",
            color: emp?.color ?? "#6b7280",
            date: dateStr,
            startTime: shortTime(s.startTime),
            endTime: shortTime(s.endTime),
            note: s.note,
          }
        })

      const dayOpenShifts: AdminOpenShift[] = monthShifts
        .filter((s) => s.date === dateStr && s.status === "open")
        .map((s) => {
          const claimsForShift = pendingClaims.filter((c) => c.shiftId === s.id)
          return {
            id: s.id,
            date: dateStr,
            startTime: shortTime(s.startTime),
            endTime: shortTime(s.endTime),
            note: s.note,
            claims: claimsForShift.map((c) => {
              const emp = colorMap.get(c.claimedByUserId)
              return { claimId: c.id, userId: c.claimedByUserId, userName: emp?.name ?? "—", color: emp?.color ?? "#6b7280" }
            }),
          }
        })

      return {
        date: dateStr,
        isCurrentMonth: date.getMonth() === monthNum - 1,
        isToday: dateStr === todayStr,
        shifts: dayShifts,
        openShifts: dayOpenShifts,
        requestedShifts: dayRequestedShifts,
      }
    }),
  )

  const prevMonth =
    monthNum === 1 ? `${year - 1}-12` : `${year}-${String(monthNum - 1).padStart(2, "0")}`
  const nextMonth =
    monthNum === 12 ? `${year + 1}-01` : `${year}-${String(monthNum + 1).padStart(2, "0")}`

  const bhMap = new Map(orgBusinessHours.map((r) => [r.dayOfWeek, r]))

  const activeEmployees = employees.filter((e) => !e.archivedAt)

  const employeeOptions = activeEmployees.map((e) => ({ id: e.id, name: e.name }))

  const templates = activeEmployees.map((e) => ({
    id: e.id,
    name: e.name,
    defaultDays: e.defaultDays ?? "",
    defaultStartTime: e.defaultStartTime ? shortTime(e.defaultStartTime) : "",
    defaultEndTime: e.defaultEndTime ? shortTime(e.defaultEndTime) : "",
  }))

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <AdminMonthCalendar
        weeks={calendarWeeks}
        employees={employeeOptions}
        monthLabel={formatMonthLabel(year, monthNum)}
        prevMonth={prevMonth}
        nextMonth={nextMonth}
        businessHours={bhMap}
        templates={templates}
        defaultFrom={firstOfMonth}
        defaultTo={lastOfMonth}
      />
    </div>
  )
}
