"use client"

import { useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MoreHorizontal, Check, X, Trash2 } from "lucide-react"
import { adminResolveReplacement, adminDeleteReplacement } from "@/app/actions/shift-replacements"

export interface AdminReplacementRequest {
  id: string
  shiftDate: string
  shiftTime: string
  requesterName: string
  replacementName: string
  status: "pending" | "accepted" | "rejected"
  note: string | null
  createdAt: string
}

const statusLabel: Record<AdminReplacementRequest["status"], string> = {
  pending: "Čaká",
  accepted: "Prijatá",
  rejected: "Odmietnutá",
}

const statusVariant: Record<AdminReplacementRequest["status"], "secondary" | "default" | "destructive"> = {
  pending: "secondary",
  accepted: "default",
  rejected: "destructive",
}

export function AdminReplacementsTable({ requests }: { requests: AdminReplacementRequest[] }) {
  const [isPending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  function resolve(id: string, response: "accepted" | "rejected") {
    setLoadingId(id)
    startTransition(async () => {
      await adminResolveReplacement(id, response)
      setLoadingId(null)
    })
  }

  function remove(id: string) {
    setLoadingId(id)
    startTransition(async () => {
      await adminDeleteReplacement(id)
      setLoadingId(null)
    })
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Zmena</TableHead>
            <TableHead>Žiadateľ</TableHead>
            <TableHead>Navrhnutý náhradník</TableHead>
            <TableHead>Poznámka</TableHead>
            <TableHead>Vytvorené</TableHead>
            <TableHead>Stav</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                Žiadne žiadosti o zastup
              </TableCell>
            </TableRow>
          ) : (
            requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  {r.shiftDate}
                  <span className="ml-2 text-muted-foreground text-sm">{r.shiftTime}</span>
                </TableCell>
                <TableCell>{r.requesterName}</TableCell>
                <TableCell>{r.replacementName}</TableCell>
                <TableCell className="text-muted-foreground max-w-48 truncate">{r.note ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{r.createdAt}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[r.status]}>{statusLabel[r.status]}</Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        disabled={isPending && loadingId === r.id}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {r.status === "pending" && (
                        <>
                          <DropdownMenuItem onClick={() => resolve(r.id, "accepted")}>
                            <Check className="size-4" />
                            Schváliť
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => resolve(r.id, "rejected")}>
                            <X className="size-4" />
                            Zamietnuť
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem
                        onClick={() => remove(r.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="size-4" />
                        Zmazať
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
