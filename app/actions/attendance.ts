"use server"

import { db } from "@/db"
import { attendance } from "@/db/schema"
import { getSession } from "@/lib/session"
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
