import { db } from "@/db"
import { shifts, user } from "@/db/schema"
import { eq, and, gte, lte, asc } from "drizzle-orm"
import { requireAdmin } from "@/lib/auth-guard"
import { AdminMonthCalendar, type AdminCalendarDay, type AdminCalendarShift } from "@/components/schedule/admin-month-calendar"
import { TemplatePanel } from "@/components/schedule/template-panel"
import { getMonthGrid, toDateStr, formatMonthLabel, shortTime } from "@/lib/week"

export default async function AdminSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  await requireAdmin()

  const { month } = await searchParams
  const { year, monthNum, weeks } = getMonthGrid(month)

  const startDate = toDateStr(weeks[0][0])
  const endDate = toDateStr(weeks[weeks.length - 1][6])
  const todayStr = toDateStr(new Date())
  const monthStr = `${year}-${String(monthNum).padStart(2, "0")}`
  const firstOfMonth = `${monthStr}-01`
  const lastOfMonth = toDateStr(new Date(year, monthNum, 0, 12, 0, 0))

  const [monthShifts, employees] = await Promise.all([
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
      .where(and(gte(shifts.date, startDate), lte(shifts.date, endDate)))
      .orderBy(asc(shifts.startTime)),

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
      .orderBy(asc(user.name)),
  ])

  const colorMap = new Map(employees.map((e) => [e.id, { name: e.name, color: e.color ?? "#6b7280" }]))

  const calendarWeeks: AdminCalendarDay[][] = weeks.map((week) =>
    week.map((date) => {
      const dateStr = toDateStr(date)
      const dayShifts: AdminCalendarShift[] = monthShifts
        .filter((s) => s.date === dateStr)
        .map((s) => {
          const emp = colorMap.get(s.userId)
          return {
            id: s.id,
            userId: s.userId,
            userName: emp?.name ?? "—",
            date: dateStr,
            startTime: shortTime(s.startTime),
            endTime: shortTime(s.endTime),
            note: s.note,
            status: s.status,
            color: emp?.color ?? "#6b7280",
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
    monthNum === 1 ? `${year - 1}-12` : `${year}-${String(monthNum - 1).padStart(2, "0")}`
  const nextMonth =
    monthNum === 12 ? `${year + 1}-01` : `${year}-${String(monthNum + 1).padStart(2, "0")}`

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
    <div className="flex flex-col gap-6 max-w-5xl">
      <h1 className="text-2xl font-semibold">Správa smien</h1>

      <TemplatePanel
        employees={templates}
        defaultFrom={firstOfMonth}
        defaultTo={lastOfMonth}
      />

      <AdminMonthCalendar
        weeks={calendarWeeks}
        employees={employeeOptions}
        monthLabel={formatMonthLabel(year, monthNum)}
        prevMonth={prevMonth}
        nextMonth={nextMonth}
      />
    </div>
  )
}
