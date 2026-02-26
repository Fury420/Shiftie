import { db } from "@/db"
import { attendance } from "@/db/schema"
import { getSession } from "@/lib/session"
import { eq, and, isNull, gte, lt } from "drizzle-orm"
import { ClockCard } from "@/components/attendance/clock-card"
import { AttendanceTable } from "@/components/attendance/attendance-table"

const TZ = "Europe/Bratislava"

function formatTime(date: Date) {
  return date.toLocaleTimeString("sk-SK", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })
}

function formatDate(date: Date) {
  return date.toLocaleDateString("sk-SK", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "numeric",
  })
}

function roundTo15(ms: number): number {
  return Math.round(ms / 60000 / 15) * 15
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, "0")}m`
}

function monthBounds(year: number, month: number) {
  // Use 3h buffer to account for Europe/Bratislava offset (UTC+1/+2)
  const start = new Date(Date.UTC(year, month - 1, 1) - 3 * 3_600_000)
  const end = new Date(Date.UTC(year, month, 1) + 3 * 3_600_000)
  return { start, end }
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const session = await getSession()
  if (!session) return null

  const now = new Date()
  let year: number, monthNum: number

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    ;[year, monthNum] = month.split("-").map(Number)
  } else {
    year = now.getFullYear()
    monthNum = now.getMonth() + 1
  }

  const { start, end } = monthBounds(year, monthNum)

  const [openRecord, records] = await Promise.all([
    db
      .select()
      .from(attendance)
      .where(and(eq(attendance.userId, session.user.id), isNull(attendance.clockOut)))
      .limit(1)
      .then((r) => r[0] ?? null),

    db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.userId, session.user.id),
          gte(attendance.clockIn, start),
          lt(attendance.clockIn, end),
        ),
      )
      .orderBy(attendance.clockIn),
  ])

  const formattedRecords = records.map((r) => {
    const dow = r.clockIn.toLocaleDateString("en-US", { timeZone: TZ, weekday: "short" })
    return {
      id: r.id,
      date: formatDate(r.clockIn),
      clockIn: formatTime(r.clockIn),
      clockOut: r.clockOut ? formatTime(r.clockOut) : null,
      duration: r.clockOut ? formatDuration(roundTo15(r.clockOut.getTime() - r.clockIn.getTime())) : null,
      isOpen: !r.clockOut,
      isWeekend: dow === "Sat" || dow === "Sun",
    }
  })

  const totalMinutes = records.reduce((sum, r) => {
    if (!r.clockOut) return sum
    return sum + roundTo15(r.clockOut.getTime() - r.clockIn.getTime())
  }, 0)

  const totalMs = records.reduce((sum, r) => {
    if (!r.clockOut) return sum
    return sum + (r.clockOut.getTime() - r.clockIn.getTime())
  }, 0)

  const monthLabel = new Date(year, monthNum - 1).toLocaleDateString("sk-SK", {
    month: "long",
    year: "numeric",
  })

  const pad = (n: number) => String(n).padStart(2, "0")
  const prevDate = new Date(year, monthNum - 2)
  const nextDate = new Date(year, monthNum)
  const prevMonth = `${prevDate.getFullYear()}-${pad(prevDate.getMonth() + 1)}`
  const nextMonth = `${nextDate.getFullYear()}-${pad(nextDate.getMonth() + 1)}`
  const isCurrentMonth = year === now.getFullYear() && monthNum === now.getMonth() + 1

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Dochádzka</h1>

      <ClockCard
        isActive={!!openRecord}
        clockInTime={openRecord?.clockIn.toISOString() ?? null}
      />

      <AttendanceTable
        records={formattedRecords}
        totalDuration={formatDuration(totalMinutes)}
        totalMs={totalMs}
        activeClockInTime={openRecord?.clockIn.toISOString() ?? null}
        monthLabel={monthLabel}
        prevMonth={prevMonth}
        nextMonth={nextMonth}
        isCurrentMonth={isCurrentMonth}
        userName={session.user.name}
      />
    </div>
  )
}
