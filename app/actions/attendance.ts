"use server"

import { db } from "@/db"
import { attendance } from "@/db/schema"
import { getSession } from "@/lib/session"
import { requireAdmin } from "@/lib/auth-guard"
import { eq, and, isNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function clockIn() {
  const session = await getSession()
  if (!session) throw new Error("Neprihlásený")

  const [open] = await db
    .select({ id: attendance.id })
    .from(attendance)
    .where(and(eq(attendance.userId, session.user.id), isNull(attendance.clockOut)))
    .limit(1)

  if (open) return

  await db.insert(attendance).values({
    userId: session.user.id,
    clockIn: new Date(),
  })

  revalidatePath("/attendance")
}

export async function clockOut() {
  const session = await getSession()
  if (!session) throw new Error("Neprihlásený")

  const [open] = await db
    .select({ id: attendance.id })
    .from(attendance)
    .where(and(eq(attendance.userId, session.user.id), isNull(attendance.clockOut)))
    .limit(1)

  if (!open) return

  await db
    .update(attendance)
    .set({ clockOut: new Date() })
    .where(eq(attendance.id, open.id))

  revalidatePath("/attendance")
}

export async function updateOwnAttendance(
  id: string,
  dateStr: string,    // YYYY-MM-DD in Europe/Bratislava
  newClockIn: string, // HH:MM
  newClockOut: string // HH:MM
) {
  const session = await getSession()
  if (!session) throw new Error("Neprihlásený")

  const [record] = await db
    .select({ id: attendance.id })
    .from(attendance)
    .where(and(eq(attendance.id, id), eq(attendance.userId, session.user.id)))
    .limit(1)

  if (!record) return

  const toUTC = (time: string): Date => {
    const probe = new Date(`${dateStr}T12:00:00Z`)
    const bratislavaHour = parseInt(
      probe.toLocaleString("en-US", { timeZone: "Europe/Bratislava", hour: "numeric", hour12: false })
    )
    const offset = bratislavaHour - 12
    const [h, m] = time.split(":").map(Number)
    const [y, mo, d] = dateStr.split("-").map(Number)
    return new Date(Date.UTC(y, mo - 1, d, h - offset, m, 0, 0))
  }

  await db
    .update(attendance)
    .set({ clockIn: toUTC(newClockIn), clockOut: toUTC(newClockOut) })
    .where(eq(attendance.id, id))

  revalidatePath("/attendance")
}

export async function adminUpdateAttendance(id: string, clockIn: string, clockOut: string) {
  await requireAdmin()

  await db
    .update(attendance)
    .set({ clockIn: new Date(clockIn), clockOut: new Date(clockOut) })
    .where(eq(attendance.id, id))

  revalidatePath("/admin/reports")
}

export async function adminDeleteAttendance(id: string) {
  await requireAdmin()

  await db.delete(attendance).where(eq(attendance.id, id))

  revalidatePath("/admin/reports")
}
