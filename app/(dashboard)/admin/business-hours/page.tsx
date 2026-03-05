export const dynamic = "force-dynamic"

import { requireAdmin } from "@/lib/auth-guard"
import { getOrganizationId } from "@/lib/auth-guard"
import { getBusinessHours } from "@/app/actions/business-hours"
import { BusinessHoursForm } from "@/components/business-hours/business-hours-form"

export default async function AdminBusinessHoursPage() {
  await requireAdmin()
  const orgId = await getOrganizationId()
  const hours = await getBusinessHours(orgId)

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Otváracie hodiny</h1>
      <BusinessHoursForm initial={hours} />
    </div>
  )
}
