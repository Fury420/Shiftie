"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { LeaveRequestDialog } from "@/components/leaves/leave-request-dialog"
import { EmployeeLeavesTable, type LeaveRow } from "@/components/leaves/employee-leaves-table"
import { MyRequestsTable } from "@/components/shift-replacement/my-requests-table"
import { IncomingRequestsTable } from "@/components/shift-replacement/incoming-requests-table"
import { AdminReplacementsTable } from "@/components/shift-replacement/admin-replacements-table"

interface MyRequest {
  id: string
  shiftDate: string
  shiftTime: string
  replacementName: string
  status: "pending" | "accepted" | "rejected"
  note: string | null
}

interface IncomingRequest {
  id: string
  shiftDate: string
  shiftTime: string
  requesterName: string
  note: string | null
}

interface AdminRequest {
  id: string
  shiftDate: string
  shiftTime: string
  requesterName: string
  replacementName: string
  status: "pending"
  note: string | null
  createdAt: string
}

interface Props {
  leaves: LeaveRow[]
  isAdmin: boolean
  myRequests: MyRequest[]
  incomingRequests: IncomingRequest[]
  allPendingRequests: AdminRequest[]
  monthLabel: string
  prevMonth: string
  nextMonth: string
  isCurrentMonth: boolean
}

export function CombinedClient({
  leaves,
  isAdmin,
  myRequests,
  incomingRequests,
  allPendingRequests,
  monthLabel,
  prevMonth,
  nextMonth,
  isCurrentMonth,
}: Props) {
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <h1 className="text-2xl font-semibold">Voľno & zastup</h1>

      {/* ── Dovolenky ─────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Dovolenky a voľno</h2>
          <Button size="sm" onClick={() => setLeaveDialogOpen(true)}>
            <Plus className="size-4" />
            Nová žiadosť
          </Button>
        </div>
        <EmployeeLeavesTable rows={leaves} />
      </section>

      {/* ── Zastup ────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        {isAdmin ? (
          <>
            <h2 className="text-lg font-medium">Čakajúce žiadosti o zastup</h2>
            <p className="text-sm text-muted-foreground -mt-1">
              Všetky žiadosti o zastup čakajúce na vybavenie.
            </p>
            <AdminReplacementsTable requests={allPendingRequests} />
          </>
        ) : (
          <>
            <h2 className="text-lg font-medium">Žiadosti o mňa</h2>
            <p className="text-sm text-muted-foreground -mt-1">
              Kolegovia ťa navrhli ako náhradníka na tieto zmeny.
            </p>
            <IncomingRequestsTable requests={incomingRequests} />
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Moje žiadosti o zastup</h2>
        <MyRequestsTable
          requests={myRequests}
          monthLabel={monthLabel}
          prevMonth={prevMonth}
          nextMonth={nextMonth}
          isCurrentMonth={isCurrentMonth}
        />
      </section>

      <LeaveRequestDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen} />
    </div>
  )
}
