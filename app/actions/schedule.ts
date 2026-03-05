"use server"

import { db } from "@/db"
import { shifts, user, openShiftClaims } from "@/db/schema"
import { eq, inArray, and, lt, gt, ne, isNull, isNotNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { requireAdmin, getOrganizationId } from "@/lib/auth-guard"
import { getSession } from "@/lib/session"
import { toDateStr, addDays } from "@/lib/week"

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

export async function createShift(data: {
  userId: string | null
  date: string
  startTime: string
  endTime: string
  note?: string
}) {
  await requireAdmin()
  const orgId = await getOrganizationId()
  if (data.userId) {
    await checkConflict(data.userId, data.date, data.startTime, data.endTime)
  }

  await db.insert(shifts).values({
    organizationId: orgId,
    userId: data.userId ?? null,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    note: data.note || null,
    status: data.userId ? "draft" : "open",
  })

  revalidatePath("/admin/schedule")
  revalidatePath("/schedule")
}

export async function updateShift(
  id: string,
  data: { userId: string | null; date: string; startTime: string; endTime: string; note?: string },
) {
  await requireAdmin()
  const orgId = await getOrganizationId()
  if (data.userId) {
    await checkConflict(data.userId, data.date, data.startTime, data.endTime, id)
  }

  await db
    .update(shifts)
    .set({
      userId: data.userId ?? null,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      note: data.note || null,
      status: data.userId ? "draft" : "open",
      updatedAt: new Date(),
    })
    .where(and(eq(shifts.id, id), eq(shifts.organizationId, orgId)))

  revalidatePath("/admin/schedule")
  revalidatePath("/schedule")
}

export async function requestShift(data: {
  date: string
  startTime: string
  endTime: string
  note?: string
}) {
  const session = await getSession()
  if (!session) throw new Error("Nie ste prihlásený")
  const orgId = await getOrganizationId()
  const userId = session.user.id

  await checkConflict(userId, data.date, data.startTime, data.endTime)

  await db.insert(shifts).values({
    organizationId: orgId,
    userId,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    note: data.note || null,
    status: "requested",
  })

  revalidatePath("/schedule")
  revalidatePath("/admin/schedule")
}

export async function approveShiftRequest(id: string) {
  await requireAdmin()
  const orgId = await getOrganizationId()

  await db
    .update(shifts)
    .set({ status: "published", updatedAt: new Date() })
    .where(and(eq(shifts.id, id), eq(shifts.organizationId, orgId)))

  revalidatePath("/admin/schedule")
  revalidatePath("/schedule")
}

export async function rejectShiftRequest(id: string) {
  await requireAdmin()
  const orgId = await getOrganizationId()

  await db.delete(shifts).where(and(eq(shifts.id, id), eq(shifts.organizationId, orgId)))

  revalidatePath("/admin/schedule")
  revalidatePath("/schedule")
}

export async function claimShift(shiftId: string) {
  const session = await getSession()
  if (!session) throw new Error("Nie ste prihlásený")
  const orgId = await getOrganizationId()
  const userId = session.user.id

  // Check shift exists and is open
  const [shift] = await db
    .select({ id: shifts.id, status: shifts.status, startTime: shifts.startTime, endTime: shifts.endTime, date: shifts.date })
    .from(shifts)
    .where(and(eq(shifts.id, shiftId), eq(shifts.organizationId, orgId), eq(shifts.status, "open")))
    .limit(1)
  if (!shift) throw new Error("Zmena nie je dostupná")

  // Check no existing pending claim by this user
  const [existingClaim] = await db
    .select({ id: openShiftClaims.id })
    .from(openShiftClaims)
    .where(and(eq(openShiftClaims.shiftId, shiftId), eq(openShiftClaims.claimedByUserId, userId), eq(openShiftClaims.status, "pending")))
    .limit(1)
  if (existingClaim) throw new Error("Už ste sa na túto zmenu prihlásili")

  // Check no shift conflict
  await checkConflict(userId, shift.date, shift.startTime, shift.endTime)

  await db.insert(openShiftClaims).values({
    organizationId: orgId,
    shiftId,
    claimedByUserId: userId,
    status: "pending",
  })

  revalidatePath("/schedule")
  revalidatePath("/admin/schedule")
}

export async function approveShiftClaim(claimId: string) {
  await requireAdmin()
  const orgId = await getOrganizationId()

  const [claim] = await db
    .select({ id: openShiftClaims.id, shiftId: openShiftClaims.shiftId, claimedByUserId: openShiftClaims.claimedByUserId })
    .from(openShiftClaims)
    .where(and(eq(openShiftClaims.id, claimId), eq(openShiftClaims.organizationId, orgId)))
    .limit(1)
  if (!claim) throw new Error("Prihlásenie nenájdené")

  await db
    .update(shifts)
    .set({ userId: claim.claimedByUserId, status: "published", updatedAt: new Date() })
    .where(and(eq(shifts.id, claim.shiftId), eq(shifts.organizationId, orgId)))

  await db
    .update(openShiftClaims)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(openShiftClaims.id, claimId))

  // Reject all other pending claims for the same shift
  await db
    .update(openShiftClaims)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(and(eq(openShiftClaims.shiftId, claim.shiftId), ne(openShiftClaims.id, claimId), eq(openShiftClaims.status, "pending")))

  revalidatePath("/admin/schedule")
  revalidatePath("/schedule")
}

export async function rejectShiftClaim(claimId: string) {
  await requireAdmin()
  const orgId = await getOrganizationId()

  await db
    .update(openShiftClaims)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(and(eq(openShiftClaims.id, claimId), eq(openShiftClaims.organizationId, orgId)))

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

export async function toggleShiftStatus(id: string, current: "requested" | "draft" | "open" | "published") {
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
