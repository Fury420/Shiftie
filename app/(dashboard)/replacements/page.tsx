export const dynamic = "force-dynamic"

import { db } from "@/db"
import { shiftReplacements, shifts, user, leaves } from "@/db/schema"
import { getSession } from "@/lib/session"
import { eq, and, gte, lt, desc } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { shortTime } from "@/lib/week"
import { CombinedClient } from "./combined-client"

function formatShiftDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("sk-SK", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  })
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

export default async function ZastupPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const session = await getSession()
  if (!session) return null

  const { month } = await searchParams
  const now = new Date()
  let year: number, monthNum: number

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    ;[year, monthNum] = month.split("-").map(Number)
  } else {
    year = now.getFullYear()
    monthNum = now.getMonth() + 1
  }

  const monthStart = `${year}-${pad(monthNum)}-01`
  const nextDate = new Date(year, monthNum, 1)
  const monthEnd = `${nextDate.getFullYear()}-${pad(nextDate.getMonth() + 1)}-01`

  const monthLabel = new Date(year, monthNum - 1).toLocaleDateString("sk-SK", {
    month: "long",
    year: "numeric",
  })
  const prevDate = new Date(year, monthNum - 2, 1)
  const prevMonth = `${prevDate.getFullYear()}-${pad(prevDate.getMonth() + 1)}`
  const nextMonth = `${nextDate.getFullYear()}-${pad(nextDate.getMonth() + 1)}`
  const isCurrentMonth = year === now.getFullYear() && monthNum === now.getMonth() + 1

  const isAdmin = (session.user as { role?: string }).role === "admin"
  const userId = session.user.id
  const requester = alias(user, "requester")
  const replacement = alias(user, "replacement")

  const [myRequests, incomingRequests, allPendingRequests, leavesData] = await Promise.all([
    db
      .select({
        id: shiftReplacements.id,
        shiftDate: shifts.date,
        shiftStart: shifts.startTime,
        shiftEnd: shifts.endTime,
        replacementName: replacement.name,
        status: shiftReplacements.status,
        note: shiftReplacements.note,
      })
      .from(shiftReplacements)
      .innerJoin(shifts, eq(shiftReplacements.shiftId, shifts.id))
      .innerJoin(replacement, eq(shiftReplacements.replacementUserId, replacement.id))
      .where(
        and(
          eq(shiftReplacements.requestedByUserId, userId),
          gte(shifts.date, monthStart),
          lt(shifts.date, monthEnd),
        ),
      )
      .orderBy(shifts.date),

    isAdmin ? Promise.resolve([]) : db
      .select({
        id: shiftReplacements.id,
        shiftDate: shifts.date,
        shiftStart: shifts.startTime,
        shiftEnd: shifts.endTime,
        requesterName: requester.name,
        note: shiftReplacements.note,
      })
      .from(shiftReplacements)
      .innerJoin(shifts, eq(shiftReplacements.shiftId, shifts.id))
      .innerJoin(requester, eq(shiftReplacements.requestedByUserId, requester.id))
      .where(
        and(
          eq(shiftReplacements.replacementUserId, userId),
          eq(shiftReplacements.status, "pending"),
        ),
      )
      .orderBy(shiftReplacements.createdAt),

    isAdmin ? db
      .select({
        id: shiftReplacements.id,
        shiftDate: shifts.date,
        shiftStart: shifts.startTime,
        shiftEnd: shifts.endTime,
        requesterName: requester.name,
        replacementName: replacement.name,
        status: shiftReplacements.status,
        note: shiftReplacements.note,
        createdAt: shiftReplacements.createdAt,
      })
      .from(shiftReplacements)
      .innerJoin(shifts, eq(shiftReplacements.shiftId, shifts.id))
      .innerJoin(requester, eq(shiftReplacements.requestedByUserId, requester.id))
      .innerJoin(replacement, eq(shiftReplacements.replacementUserId, replacement.id))
      .where(eq(shiftReplacements.status, "pending"))
      .orderBy(shiftReplacements.createdAt)
    : Promise.resolve([]),

    db
      .select({
        id: leaves.id,
        type: leaves.type,
        startDate: leaves.startDate,
        endDate: leaves.endDate,
        status: leaves.status,
        note: leaves.note,
      })
      .from(leaves)
      .where(eq(leaves.userId, userId))
      .orderBy(desc(leaves.createdAt)),
  ])

  const myFormatted = myRequests.map((r) => ({
    id: r.id,
    shiftDate: formatShiftDate(r.shiftDate),
    shiftTime: `${shortTime(r.shiftStart)}–${shortTime(r.shiftEnd)}`,
    replacementName: r.replacementName,
    status: r.status as "pending" | "accepted" | "rejected",
    note: r.note,
  }))

  const incomingFormatted = incomingRequests.map((r) => ({
    id: r.id,
    shiftDate: formatShiftDate(r.shiftDate),
    shiftTime: `${shortTime(r.shiftStart)}–${shortTime(r.shiftEnd)}`,
    requesterName: "requesterName" in r ? r.requesterName : "",
    note: r.note,
  }))

  const allPendingFormatted = (allPendingRequests as typeof allPendingRequests).map((r) => ({
    id: r.id,
    shiftDate: formatShiftDate(r.shiftDate),
    shiftTime: `${shortTime(r.shiftStart)}–${shortTime(r.shiftEnd)}`,
    requesterName: "requesterName" in r ? r.requesterName : "",
    replacementName: "replacementName" in r ? r.replacementName : "",
    status: "pending" as const,
    note: r.note,
    createdAt: "createdAt" in r
      ? new Date(r.createdAt as Date).toLocaleDateString("sk-SK", { day: "numeric", month: "numeric", year: "numeric" })
      : "",
  }))

  return (
    <CombinedClient
      leaves={leavesData}
      isAdmin={isAdmin}
      myRequests={myFormatted}
      incomingRequests={incomingFormatted}
      allPendingRequests={allPendingFormatted}
      monthLabel={monthLabel}
      prevMonth={prevMonth}
      nextMonth={nextMonth}
      isCurrentMonth={isCurrentMonth}
    />
  )
}
