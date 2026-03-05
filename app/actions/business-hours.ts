"use server"

import { db } from "@/db"
import { businessHours } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { requireAdmin, getOrganizationId } from "@/lib/auth-guard"

export type BusinessHoursRow = {
  dayOfWeek: string
  openTime: string | null
  closeTime: string | null
  isClosed: boolean
}

/** Vráti otváracie hodiny pre organizáciu – pre každý deň 0–6 (Ne–So). Chýbajúce dni = isClosed: true. */
export async function getBusinessHours(organizationId: string): Promise<BusinessHoursRow[]> {
  const rows = await db
    .select({
      dayOfWeek: businessHours.dayOfWeek,
      openTime: businessHours.openTime,
      closeTime: businessHours.closeTime,
      isClosed: businessHours.isClosed,
    })
    .from(businessHours)
    .where(eq(businessHours.organizationId, organizationId))

  const byDay = new Map(rows.map((r) => [r.dayOfWeek, r]))
  return ["0", "1", "2", "3", "4", "5", "6"].map((day) => {
    const row = byDay.get(day)
    return row
      ? {
          dayOfWeek: row.dayOfWeek,
          openTime: row.openTime,
          closeTime: row.closeTime,
          isClosed: row.isClosed,
        }
      : { dayOfWeek: day, openTime: null, closeTime: null, isClosed: true }
  })
}

/** Aktualizuje jeden deň (dayOfWeek "0".."6"). */
export async function updateBusinessHours(
  dayOfWeek: string,
  data: { openTime: string | null; closeTime: string | null; isClosed: boolean },
) {
  await requireAdmin()
  const orgId = await getOrganizationId()

  const existing = await db
    .select({ id: businessHours.id })
    .from(businessHours)
    .where(
      and(
        eq(businessHours.organizationId, orgId),
        eq(businessHours.dayOfWeek, dayOfWeek),
      ),
    )
    .limit(1)

  if (existing.length > 0) {
    await db
      .update(businessHours)
      .set({
        openTime: data.isClosed ? null : data.openTime,
        closeTime: data.isClosed ? null : data.closeTime,
        isClosed: data.isClosed,
        updatedAt: new Date(),
      })
      .where(eq(businessHours.id, existing[0]!.id))
  } else {
    await db.insert(businessHours).values({
      organizationId: orgId,
      dayOfWeek,
      openTime: data.isClosed ? null : data.openTime,
      closeTime: data.isClosed ? null : data.closeTime,
      isClosed: data.isClosed,
    })
  }

  revalidatePath("/admin/business-hours")
  revalidatePath("/admin/schedule")
  revalidatePath("/schedule")
}

/** Pre daný dátum (YYYY-MM-DD) vráti otváracie hodiny pre organizáciu. dayOfWeek z dátumu: 0=Ne..6=So. */
export async function getBusinessHoursForDate(
  organizationId: string,
  dateStr: string,
): Promise<{ openTime: string | null; closeTime: string | null; isClosed: boolean }> {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d, 12, 0, 0)
  const dayOfWeek = date.getDay().toString() // "0".."6"

  const [row] = await db
    .select({
      openTime: businessHours.openTime,
      closeTime: businessHours.closeTime,
      isClosed: businessHours.isClosed,
    })
    .from(businessHours)
    .where(
      and(
        eq(businessHours.organizationId, organizationId),
        eq(businessHours.dayOfWeek, dayOfWeek),
      ),
    )
    .limit(1)

  if (!row) return { openTime: null, closeTime: null, isClosed: true }
  return {
    openTime: row.openTime,
    closeTime: row.closeTime,
    isClosed: row.isClosed,
  }
}

/** Vráti mapu dateStr -> { openTime, closeTime } pre dni kedy je otvorené (pre kalendár). */
export async function getBusinessHoursMapForRange(
  organizationId: string,
  startDate: string,
  endDate: string,
): Promise<Record<string, { openTime: string; closeTime: string }>> {
  const hours = await getBusinessHours(organizationId)
  const result: Record<string, { openTime: string; closeTime: string }> = {}
  const [sy, sm, sd] = startDate.split("-").map(Number)
  const [ey, em, ed] = endDate.split("-").map(Number)
  const start = new Date(sy, sm - 1, sd, 12, 0, 0)
  const end = new Date(ey, em - 1, ed, 12, 0, 0)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    const day = hours[d.getDay()]!
    if (!day.isClosed && day.openTime && day.closeTime) {
      result[dateStr] = {
        openTime: day.openTime.slice(0, 5),
        closeTime: day.closeTime.slice(0, 5),
      }
    }
  }
  return result
}
