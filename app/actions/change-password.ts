"use server"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { user } from "@/db/schema"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"

export async function changeFirstLoginPassword(currentPassword: string, newPassword: string) {
  const reqHeaders = await headers()
  const session = await auth.api.getSession({ headers: reqHeaders })

  if (!session) {
    throw new Error("Nie ste prihlásený.")
  }

  await auth.api.changePassword({
    body: { currentPassword, newPassword, revokeOtherSessions: false },
    headers: reqHeaders,
  })

  await db
    .update(user)
    .set({ mustChangePassword: false, updatedAt: new Date() })
    .where(eq(user.id, session.user.id))
}
