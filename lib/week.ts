const TZ = "Europe/Bratislava"

/** Returns the Monday of the week containing the given date */
export function getWeekMonday(from?: string | null): Date {
  // Parse "YYYY-MM-DD" as LOCAL noon to avoid UTC-offset shifting the day
  let base: Date
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    const [y, m, d] = from.split("-").map(Number)
    base = new Date(y, m - 1, d, 12, 0, 0)
  } else {
    base = new Date()
  }
  const day = base.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(base)
  monday.setDate(base.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

/** YYYY-MM-DD string from a Date (uses local date, not UTC) */
export function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Offset date by N days */
export function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(d.getDate() + n)
  return result
}

/** "Po 24. 2." label in Slovak */
export function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00") // noon to avoid DST edge cases
  return d.toLocaleDateString("sk-SK", { timeZone: TZ, weekday: "short", day: "numeric", month: "numeric" })
}

/** "23. feb – 1. mar 2026" week range label */
export function formatWeekLabel(monday: Date): string {
  const sunday = addDays(monday, 6)
  const from = monday.toLocaleDateString("sk-SK", { timeZone: TZ, day: "numeric", month: "short" })
  const to = sunday.toLocaleDateString("sk-SK", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" })
  return `${from} – ${to}`
}

/** "HH:MM:SS" → "HH:MM" */
export function shortTime(t: string): string {
  return t.slice(0, 5)
}

/** Builds a calendar grid for the given month (YYYY-MM), padded to full Mon–Sun weeks */
export function getMonthGrid(month?: string | null): {
  year: number
  monthNum: number
  weeks: Date[][]
} {
  const now = new Date()
  let year = now.getFullYear()
  let monthNum = now.getMonth() + 1

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number)
    year = y
    monthNum = m
  }

  const firstDay = new Date(year, monthNum - 1, 1, 12, 0, 0)
  const lastDay = new Date(year, monthNum, 0, 12, 0, 0)

  // Pad start to Monday
  const startDow = firstDay.getDay()
  const startOffset = startDow === 0 ? -6 : 1 - startDow
  // Pad end to Sunday
  const endDow = lastDay.getDay()
  const endOffset = endDow === 0 ? 0 : 7 - endDow

  const start = addDays(firstDay, startOffset)
  const end = addDays(lastDay, endOffset)

  const days: Date[] = []
  let cur = new Date(start)
  while (toDateStr(cur) <= toDateStr(end)) {
    days.push(new Date(cur))
    cur = addDays(cur, 1)
  }

  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  return { year, monthNum, weeks }
}

/** "február 2026" — long month name in Slovak */
export function formatMonthLabel(year: number, month: number): string {
  const d = new Date(year, month - 1, 1, 12, 0, 0)
  return d.toLocaleDateString("sk-SK", { timeZone: TZ, month: "long", year: "numeric" })
}
