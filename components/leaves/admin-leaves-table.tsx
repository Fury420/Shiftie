"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { adminUpdateLeaveStatus } from "@/app/actions/leaves"

const TYPE_LABELS: Record<string, string> = {
  vacation: "Dovolenka",
  sick: "PN",
  personal: "Osobné voľno",
}

export interface AdminLeaveRow {
  id: string
  userName: string
  type: string
  startDate: string
  endDate: string
  status: string
  note: string | null
}

interface Props {
  rows: AdminLeaveRow[]
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/15 border-0">Schválená</Badge>
  if (status === "rejected") return <Badge variant="destructive" className="border-0">Zamietnutá</Badge>
  return <Badge className="bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/15 border-0">Čaká</Badge>
}

export function AdminLeavesTable({ rows }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleStatus(id: string, status: "approved" | "rejected") {
    startTransition(async () => {
      await adminUpdateLeaveStatus(id, status)
      router.refresh()
    })
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Žiadne žiadosti o voľno.</p>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Zamestnanec</TableHead>
            <TableHead>Typ</TableHead>
            <TableHead>Od</TableHead>
            <TableHead>Do</TableHead>
            <TableHead>Stav</TableHead>
            <TableHead>Poznámka</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.userName}</TableCell>
              <TableCell>{TYPE_LABELS[row.type] ?? row.type}</TableCell>
              <TableCell>{row.startDate}</TableCell>
              <TableCell>{row.endDate}</TableCell>
              <TableCell><StatusBadge status={row.status} /></TableCell>
              <TableCell className="text-sm text-muted-foreground">{row.note ?? "—"}</TableCell>
              <TableCell>
                {row.status === "pending" && (
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-green-600 hover:text-green-600"
                      disabled={isPending}
                      onClick={() => handleStatus(row.id, "approved")}
                    >
                      <Check className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:text-destructive"
                      disabled={isPending}
                      onClick={() => handleStatus(row.id, "rejected")}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
