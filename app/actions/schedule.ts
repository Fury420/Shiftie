"use server"

import { db } from "@/db"
import { shifts, user } from "@/db/schema"
import { eq, inArray, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth-guard"
import { toDateStr, addDays } from "@/lib/week"

// Mon–Thu: 16:00–21:00 | Fri–Sun: 15:00–21:00
function defaultTimes(dayOfWeek: number) {
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0
  return { startTime: isWeekend ? "15:00" : "16:00", endTime: "21:00" }
}

export async function createShift(data: {
  userId: string
  date: string
  startTime: string
  endTime: string
  note?: string
}) {
  await requireAdmin()

  await db.insert(shifts).values({
    userId: data.userId,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    note: data.note || null,
    status: "draft",
  })

  revalidatePath("/admin/schedule")
  revalidatePath("/schedule")
}

export async function updateShift(
  id: string,
  data: { userId: string; date: string; startTime: string; endTime: string; note?: string },
) {
  await requireAdmin()

  await db
    .update(shifts)
    .set({
      userId: data.userId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      note: data.note || null,
      updatedAt: new Date(),
    })
    .where(eq(shifts.id, id))

  revalidatePath("/admin/schedule")
  revalidatePath("/schedule")
}

export async function deleteShift(id: string) {
  await requireAdmin()
  await db.delete(shifts).where(eq(shifts.id, id))
  revalidatePath("/admin/schedule")
  revalidatePath("/schedule")
}

export async function toggleShiftStatus(id: string, current: "draft" | "published") {
  await requireAdmin()

  await db
    .update(shifts)
    .set({ status: current === "draft" ? "published" : "draft", updatedAt: new Date() })
    .where(eq(shifts.id, id))

  revalidatePath("/admin/schedule")
  revalidatePath("/schedule")
}

async function generateShiftsForDates(dates: Date[]) {
  const employees = await db
    .select({
      id: user.id,
      defaultDays: user.defaultDays,
      defaultStartTime: user.defaultStartTime,
      defaultEndTime: user.defaultEndTime,
    })
    .from(user)

  for (const day of dates) {
    const dateStr = toDateStr(day)
    const dayOfWeek = day.getDay()

    for (const emp of employees) {
      if (!emp.defaultDays || !emp.defaultStartTime || !emp.defaultEndTime) continue

      const days = emp.defaultDays.split(",").map(Number)
      if (!days.includes(dayOfWeek)) continue

      const [existing] = await db
        .select({ id: shifts.id })
        .from(shifts)
        .where(and(eq(shifts.userId, emp.id), eq(shifts.date, dateStr)))
        .limit(1)

      if (existing) continue

      await db.insert(shifts).values({
        userId: emp.id,
        date: dateStr,
        startTime: emp.defaultStartTime.slice(0, 5),
        endTime: emp.defaultEndTime.slice(0, 5),
        status: "draft",
      })
    }
  }
}

export async function generateDefaultWeek(mondayStr: string) {
  await requireAdmin()

  const dates = Array.from({ length: 7 }, (_, i) =>
    addDays(new Date(mondayStr + "T12:00:00"), i),
  )

  await generateShiftsForDates(dates)

  revalidatePath("/admin/schedule")
  revalidatePath("/schedule")
}

export async function generateDefaultMonth(monthStr: string) {
  await requireAdmin()

  const [y, m] = monthStr.split("-").map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()

  const dates = Array.from({ length: daysInMonth }, (_, i) =>
    new Date(y, m - 1, i + 1, 12, 0, 0),
  )

  await generateShiftsForDates(dates)

  revalidatePath("/admin/schedule")
  revalidatePath("/schedule")
}

export async function generateDefaultRange(fromStr: string, toStr: string) {
  await requireAdmin()

  const [fy, fm, fd] = fromStr.split("-").map(Number)
  const [ty, tm, td] = toStr.split("-").map(Number)

  const from = new Date(fy, fm - 1, fd, 12, 0, 0)
  const to = new Date(ty, tm - 1, td, 12, 0, 0)

  const dates: Date[] = []
  let cur = new Date(from)
  while (toDateStr(cur) <= toDateStr(to)) {
    dates.push(new Date(cur))
    cur = addDays(cur, 1)
  }

  await generateShiftsForDates(dates)

  revalidatePath("/admin/schedule")
  revalidatePath("/schedule")
}

export async function updateEmployeeTemplate(
  userId: string,
  data: { defaultDays: string; defaultStartTime: string; defaultEndTime: string },
) {
  await requireAdmin()

  await db
    .update(user)
    .set({
      defaultDays: data.defaultDays || null,
      defaultStartTime: data.defaultStartTime || null,
      defaultEndTime: data.defaultEndTime || null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId))

  revalidatePath("/admin/schedule")
}

export async function publishDraftShifts(ids: string[]) {
  await requireAdmin()
  if (ids.length === 0) return

  await db
    .update(shifts)
    .set({ status: "published", updatedAt: new Date() })
    .where(inArray(shifts.id, ids))

  revalidatePath("/admin/schedule")
  revalidatePath("/schedule")
}
