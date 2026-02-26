"use client"

import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface MyReplacementRequest {
  id: string
  shiftDate: string
  shiftTime: string
  replacementName: string
  status: "pending" | "accepted" | "rejected"
  note: string | null
}

interface MyRequestsTableProps {
  requests: MyReplacementRequest[]
  monthLabel: string
  prevMonth: string
  nextMonth: string
  isCurrentMonth: boolean
}

const statusLabel: Record<MyReplacementRequest["status"], string> = {
  pending: "Čaká",
  accepted: "Prijatá",
  rejected: "Odmietnutá",
}

const statusVariant: Record<MyReplacementRequest["status"], "secondary" | "default" | "destructive"> = {
  pending: "secondary",
  accepted: "default",
  rejected: "destructive",
}

export function MyRequestsTable({
  requests,
  monthLabel,
  prevMonth,
  nextMonth,
  isCurrentMonth,
}: MyRequestsTableProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium capitalize">{monthLabel}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/zastup?month=${prevMonth}`}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          {isCurrentMonth ? (
            <Button variant="ghost" size="icon" disabled>
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/zastup?month=${nextMonth}`}>
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Smena</TableHead>
              <TableHead>Navrhnutý náhradník</TableHead>
              <TableHead>Poznámka</TableHead>
              <TableHead>Stav</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Žiadne žiadosti za tento mesiac
                </TableCell>
              </TableRow>
            ) : (
              requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.shiftDate}
                    <span className="ml-2 text-muted-foreground text-sm">{r.shiftTime}</span>
                  </TableCell>
                  <TableCell>{r.replacementName}</TableCell>
                  <TableCell className="text-muted-foreground">{r.note ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[r.status]}>{statusLabel[r.status]}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
