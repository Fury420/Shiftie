export const dynamic = "force-dynamic"

import { db } from "@/db"
import { businessHours } from "@/db/schema"
import { eq } from "drizzle-orm"
import { requireAdmin } from "@/lib/auth-guard"
import { BusinessHoursForm } from "@/components/settings/business-hours-form"

const DAYS = [
  { value: "1", label: "Pondelok" },
  { value: "2", label: "Utorok" },
  { value: "3", label: "Streda" },
  { value: "4", label: "Štvrtok" },
  { value: "5", label: "Piatok" },
  { value: "6", label: "Sobota" },
  { value: "0", label: "Nedeľa" },
]

export default async function AdminSettingsPage() {
  const session = await requireAdmin()
  const orgId = (session.user as { organizationId?: string | null }).organizationId!

  const rows = await db
    .select()
    .from(businessHours)
    .where(eq(businessHours.organizationId, orgId))

  const hoursMap = new Map(rows.map((r) => [r.dayOfWeek, r]))

  const initialData = DAYS.map((d) => {
    const row = hoursMap.get(d.value)
    return {
      dayOfWeek: d.value,
      label: d.label,
      isClosed: row?.isClosed ?? true,
      openTime: row?.openTime?.slice(0, 5) ?? "15:00",
      closeTime: row?.closeTime?.slice(0, 5) ?? "23:00",
    }
  })

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-semibold">Nastavenia</h1>
        <p className="text-sm text-muted-foreground mt-1">Otváracie hodiny podniku</p>
      </div>
      <BusinessHoursForm initialData={initialData} />
    </div>
  )
}
