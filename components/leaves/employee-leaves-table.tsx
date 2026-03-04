"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
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
import { cancelLeave } from "@/app/actions/leaves"

const TYPE_LABELS: Record<string, string> = {
  vacation: "Dovolenka",
  sick: "PN",
  personal: "Osobné voľno",
}

export interface LeaveRow {
  id: string
  type: string
  startDate: string
  endDate: string
  status: string
  note: string | null
}

interface Props {
  rows: LeaveRow[]
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/15 border-0">Schválená</Badge>
  if (status === "rejected") return <Badge variant="destructive" className="border-0">Zamietnutá</Badge>
  return <Badge className="bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/15 border-0">Čaká na schválenie</Badge>
}

export function EmployeeLeavesTable({ rows }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleCancel(id: string) {
    startTransition(async () => {
      await cancelLeave(id)
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
              <TableCell className="font-medium">{TYPE_LABELS[row.type] ?? row.type}</TableCell>
              <TableCell>{row.startDate}</TableCell>
              <TableCell>{row.endDate}</TableCell>
              <TableCell><StatusBadge status={row.status} /></TableCell>
              <TableCell className="text-sm text-muted-foreground">{row.note ?? "—"}</TableCell>
              <TableCell>
                {row.status === "pending" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    disabled={isPending}
                    onClick={() => handleCancel(row.id)}
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
