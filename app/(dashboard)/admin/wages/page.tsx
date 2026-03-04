export const dynamic = "force-dynamic"

import { db } from "@/db"
import { attendance, user } from "@/db/schema"
import { eq, and, gte, lt, isNotNull, asc } from "drizzle-orm"
import { requireAdmin } from "@/lib/auth-guard"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WagesTable } from "@/components/wages/wages-table"

const TZ = "Europe/Bratislava"

function roundTo15(ms: number): number {
  return Math.round(ms / 60000 / 15) * 15
}

function monthBounds(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1) - 3 * 3_600_000)
  const end = new Date(Date.UTC(year, month, 1) + 3 * 3_600_000)
  return { start, end }
}

export default async function AdminWagesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  await requireAdmin()

  const { month } = await searchParams
  const now = new Date()
  let year: number, monthNum: number

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    ;[year, monthNum] = month.split("-").map(Number)
  } else {
    year = now.getFullYear()
    monthNum = now.getMonth() + 1
  }

  const { start, end } = monthBounds(year, monthNum)

  const records = await db
    .select({
      userId: attendance.userId,
      userName: user.name,
      userColor: user.color,
      userHourlyRate: user.hourlyRate,
      clockIn: attendance.clockIn,
      clockOut: attendance.clockOut,
    })
    .from(attendance)
    .leftJoin(user, eq(attendance.userId, user.id))
    .where(
      and(
        isNotNull(attendance.clockOut),
        gte(attendance.clockIn, start),
        lt(attendance.clockIn, end),
      ),
    )
    .orderBy(asc(user.name), asc(attendance.clockIn))

  const wagesMap = new Map<string, { name: string; color: string | null; hourlyRate: number | null; totalMinutes: number }>()

  for (const r of records) {
    if (!r.clockOut) continue
    const minutes = roundTo15(r.clockOut.getTime() - r.clockIn.getTime())
    const rate = r.userHourlyRate != null ? parseFloat(r.userHourlyRate) : null

    if (!wagesMap.has(r.userId)) {
      wagesMap.set(r.userId, {
        name: r.userName ?? "—",
        color: r.userColor ?? null,
        hourlyRate: rate,
        totalMinutes: 0,
      })
    }
    wagesMap.get(r.userId)!.totalMinutes += minutes
  }

  const rows = Array.from(wagesMap.entries()).map(([userId, v]) => ({ userId, ...v }))

  const pad = (n: number) => String(n).padStart(2, "0")
  const prevDate = new Date(year, monthNum - 2)
  const nextDate = new Date(year, monthNum)
  const prevMonth = `${prevDate.getFullYear()}-${pad(prevDate.getMonth() + 1)}`
  const nextMonth = `${nextDate.getFullYear()}-${pad(nextDate.getMonth() + 1)}`
  const monthLabel = new Date(year, monthNum - 1).toLocaleDateString("sk-SK", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mzdy</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/admin/wages?month=${prevMonth}`}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <span className="text-sm font-medium min-w-36 text-center capitalize">{monthLabel}</span>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/admin/wages?month=${nextMonth}`}>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      <WagesTable rows={rows} />
    </div>
  )
}
