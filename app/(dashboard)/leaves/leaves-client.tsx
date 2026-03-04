"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { LeaveRequestDialog } from "@/components/leaves/leave-request-dialog"
import { EmployeeLeavesTable, type LeaveRow } from "@/components/leaves/employee-leaves-table"

interface Props {
  rows: LeaveRow[]
}

export function LeavesClientPage({ rows }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dovolenky a voľno</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Nová žiadosť
        </Button>
      </div>

      <EmployeeLeavesTable rows={rows} />

      <LeaveRequestDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
