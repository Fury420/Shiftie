export const dynamic = "force-dynamic"

import { db } from "@/db"
import { leaves } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { getSession } from "@/lib/session"
import { LeavesClientPage } from "./leaves-client"

export default async function LeavesPage() {
  const session = await getSession()
  if (!session) return null

  const rows = await db
    .select({
      id: leaves.id,
      type: leaves.type,
      startDate: leaves.startDate,
      endDate: leaves.endDate,
      status: leaves.status,
      note: leaves.note,
    })
    .from(leaves)
    .where(eq(leaves.userId, session.user.id))
    .orderBy(desc(leaves.createdAt))

  return <LeavesClientPage rows={rows} />
}
