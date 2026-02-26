import { db } from "@/db"
import { attendance, user } from "@/db/schema"
import { eq, and, gte, lt, isNotNull, asc } from "drizzle-orm"
import { requireAdmin } from "@/lib/auth-guard"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { HoursPieChart } from "@/components/reports/hours-pie-chart"

const TZ = "Europe/Bratislava"

function roundTo15(ms: number): number {
  return Math.round(ms / 60000 / 15) * 15
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, "0")}m`
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("sk-SK", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("sk-SK", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "numeric",
  })
}

function monthBounds(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1) - 3 * 3_600_000)
  const end = new Date(Date.UTC(year, month, 1) + 3 * 3_600_000)
  return { start, end }
}

export default async function AdminReportsPage({
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
      id: attendance.id,
      userId: attendance.userId,
      userName: user.name,
      userColor: user.color,
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

  type FlatRow = { id: string; name: string; color: string | null; date: string; clockIn: string; clockOut: string; minutes: number }
  const allRows: FlatRow[] = []
  const pieMap = new Map<string, { name: string; color: string | null; totalMinutes: number }>()

  for (const r of records) {
    if (!r.clockOut) continue
    const minutes = roundTo15(r.clockOut.getTime() - r.clockIn.getTime())

    allRows.push({
      id: r.id,
      name: r.userName ?? "—",
      color: r.userColor ?? null,
      date: formatDate(r.clockIn),
      clockIn: formatTime(r.clockIn),
      clockOut: formatTime(r.clockOut),
      minutes,
    })

    if (!pieMap.has(r.userId)) {
      pieMap.set(r.userId, { name: r.userName ?? "—", color: r.userColor ?? null, totalMinutes: 0 })
    }
    pieMap.get(r.userId)!.totalMinutes += minutes
  }

  const grandTotal = allRows.reduce((s, r) => s + r.minutes, 0)

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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reporty</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/admin/reports?month=${prevMonth}`}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <span className="text-sm font-medium min-w-36 text-center capitalize">{monthLabel}</span>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/admin/reports?month=${nextMonth}`}>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {allRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Žiadne záznamy za tento mesiac.</p>
      ) : (
        <div className="grid grid-cols-2 items-start gap-6">
          {/* ── Unified table ─────────────────────────────── */}
          <div className="min-w-0 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dátum</TableHead>
                  <TableHead>Od</TableHead>
                  <TableHead>Do</TableHead>
                  <TableHead className="text-right">Spolu</TableHead>
                  <TableHead className="text-right">Zamestnanec</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allRows.map((row) => (
                  <TableRow
                    key={row.id}
                    style={{ backgroundColor: row.color ? `${row.color}18` : undefined }}
                  >
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.clockIn}</TableCell>
                    <TableCell>{row.clockOut}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatDuration(row.minutes)}
                    </TableCell>
                    <TableCell className="text-right font-medium">{row.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="font-semibold">Celkom</TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatDuration(grandTotal)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          {/* ── Pie chart ─────────────────────────────────── */}
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm font-medium text-muted-foreground mb-1">Odpracované hodiny</p>
            <HoursPieChart
              data={Array.from(pieMap.values()).map((g) => ({
                name: g.name,
                minutes: g.totalMinutes,
                color: g.color,
              }))}
            />
          </div>
        </div>
      )}
    </div>
  )
}
