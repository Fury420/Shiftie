"use server"

import { db } from "@/db"
import { shifts, user } from "@/db/schema"
import { eq, inArray, and, lt, gt, ne, isNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { requireAdmin, getOrganizationId } from "@/lib/auth-guard"
import { getSession } from "@/lib/session"
import { toDateStr, addDays } from "@/lib/week"
import { getBusinessHoursForDate } from "@/app/actions/business-hours"

async function checkConflict(
  userId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeId?: string,
) {
  const conditions = [
    eq(shifts.userId, userId),
    eq(shifts.date, date),
    lt(shifts.startTime, endTime),
    gt(shifts.endTime, startTime),
    ...(excludeId ? [ne(shifts.id, excludeId)] : []),
  ]
  const [conflict] = await db
    .select({ id: shifts.id })
    .from(shifts)
    .where(and(...conditions))
    .limit(1)
  if (conflict) throw new Error("Tento zamestnanec má v tomto čase už inú zmenu.")
}

/** Kontrola, že čas zmeny je v rámci otváracích hodín pre daný deň. */
async function validateShiftWithinBusinessHours(
  orgId: string,
  date: string,
  startTime: string,
  endTime: string,
) {
  const hours = await getBusinessHoursForDate(orgId, date)
  if (hours.isClosed || !hours.openTime || !hours.closeTime) {
    throw new Error("V tento deň je podnik zatvorený.")
  }
  const open = hours.openTime.slice(0, 5)
  const close = hours.closeTime.slice(0, 5)
  if (startTime < open || endTime > close) {
    throw new Error(`Zmena musí byť v rámci otváracích hodín (${open} – ${close}).`)
  }
}

export async function createShift(data: {
  userId: string
  date: string
  startTime: string
  endTime: string
  note?: string
}) {
  await requireAdmin()
  const orgId = await getOrganizationId()
  await validateShiftWithinBusinessHours(orgId, data.date, data.startTime, data.endTime)
  await checkConflict(data.userId, data.date, data.startTime, data.endTime)

  await db.insert(shifts).values({
    organizationId: orgId,
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
  const orgId = await getOrganizationId()
  await validateShiftWithinBusinessHours(orgId, data.date, data.startTime, data.endTime)
  await checkConflict(data.userId, data.date, data.startTime, data.endTime, id)

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
    .where(and(eq(shifts.id, id), eq(shifts.organizationId, orgId)))

  revalidatePath("/admin/schedule")
  revalidatePath("/schedule")
}

export async function deleteShift(id: string) {
  await requireAdmin()
  const orgId = await getOrganizationId()

  await db.delete(shifts).where(and(eq(shifts.id, id), eq(shifts.organizationId, orgId)))

  revalidatePath("/admin/schedule")
  revalidatePath("/schedule")
}

export async function toggleShiftStatus(id: string, current: "draft" | "published") {
  await requireAdmin()
  const orgId = await getOrganizationId()

  await db
    .update(shifts)
    .set({ status: current === "draft" ? "published" : "draft", updatedAt: new Date() })
    .where(and(eq(shifts.id, id), eq(shifts.organizationId, orgId)))

  revalidatePath("/admin/schedule")
  revalidatePath("/schedule")
}

async function generateShiftsForDates(dates: Date[], orgId: string) {
  const employees = await db
    .select({
      id: user.id,
      defaultDays: user.defaultDays,
      defaultStartTime: user.defaultStartTime,
      defaultEndTime: user.defaultEndTime,
    })
    .from(user)
    .where(and(eq(user.organizationId, orgId), isNull(user.archivedAt)))

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
        organizationId: orgId,
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
  const orgId = await getOrganizationId()

  const dates = Array.from({ length: 7 }, (_, i) =>
    addDays(new Date(mondayStr + "T12:00:00"), i),
  )

  await generateShiftsForDates(dates, orgId)

  revalidatePath("/admin/schedule")
  revalidatePath("/schedule")
}

export async function generateDefaultMonth(monthStr: string) {
  await requireAdmin()
  const orgId = await getOrganizationId()

  const [y, m] = monthStr.split("-").map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()

  const dates = Array.from({ length: daysInMonth }, (_, i) =>
    new Date(y, m - 1, i + 1, 12, 0, 0),
  )

  await generateShiftsForDates(dates, orgId)

  revalidatePath("/admin/schedule")
  revalidatePath("/schedule")
}

export async function generateDefaultRange(fromStr: string, toStr: string) {
  await requireAdmin()
  const orgId = await getOrganizationId()

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

  await generateShiftsForDates(dates, orgId)

  revalidatePath("/admin/schedule")
  revalidatePath("/schedule")
}

export async function updateEmployeeTemplate(
  userId: string,
  data: { defaultDays: string; defaultStartTime: string; defaultEndTime: string },
) {
  await requireAdmin()
  const orgId = await getOrganizationId()

  await db
    .update(user)
    .set({
      defaultDays: data.defaultDays || null,
      defaultStartTime: data.defaultStartTime || null,
      defaultEndTime: data.defaultEndTime || null,
      updatedAt: new Date(),
    })
    .where(and(eq(user.id, userId), eq(user.organizationId, orgId)))

  revalidatePath("/admin/schedule")
}

export async function publishDraftShifts(ids: string[]) {
  await requireAdmin()
  const orgId = await getOrganizationId()
  if (ids.length === 0) return

  await db
    .update(shifts)
    .set({ status: "published", updatedAt: new Date() })
    .where(and(inArray(shifts.id, ids), eq(shifts.organizationId, orgId)))

  revalidatePath("/admin/schedule")
  revalidatePath("/schedule")
}

/** Zamestnanec sa zapíše na blok (deň) – vytvorí sa zmena v čase otváracích hodín. */
export async function claimShiftBlock(date: string) {
  const session = await getSession()
  if (!session) throw new Error("Neprihlásený")
  const orgId = await getOrganizationId()

  const hours = await getBusinessHoursForDate(orgId, date)
  if (hours.isClosed || !hours.openTime || !hours.closeTime) {
    throw new Error("V tento deň je podnik zatvorený.")
  }

  const startTime = hours.openTime.slice(0, 5)
  const endTime = hours.closeTime.slice(0, 5)

  const [existing] = await db
    .select({ id: shifts.id })
    .from(shifts)
    .where(
      and(
        eq(shifts.organizationId, orgId),
        eq(shifts.userId, session.user.id),
        eq(shifts.date, date),
      ),
    )
    .limit(1)
  if (existing) throw new Error("Na tento deň už máte zmenu.")

  await checkConflict(session.user.id, date, startTime, endTime)

  await db.insert(shifts).values({
    organizationId: orgId,
    userId: session.user.id,
    date,
    startTime,
    endTime,
    status: "published",
  })

  revalidatePath("/schedule")
  revalidatePath("/attendance")
}

/** Zamestnanec zruší svoju zmenu (odhlási sa z bloku). */
export async function unclaimShift(shiftId: string) {
  const session = await getSession()
  if (!session) throw new Error("Neprihlásený")
  const orgId = await getOrganizationId()

  const [shift] = await db
    .select({ id: shifts.id })
    .from(shifts)
    .where(
      and(
        eq(shifts.id, shiftId),
        eq(shifts.organizationId, orgId),
        eq(shifts.userId, session.user.id),
      ),
    )
    .limit(1)
  if (!shift) throw new Error("Zmenu nenašiel alebo nemáte oprávnenie ju zrušiť.")

  await db.delete(shifts).where(eq(shifts.id, shiftId))

  revalidatePath("/schedule")
  revalidatePath("/attendance")
}
