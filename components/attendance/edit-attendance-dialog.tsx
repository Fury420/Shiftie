"use client"

import { useState, useTransition } from "react"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { updateOwnAttendance } from "@/app/actions/attendance"

interface EditAttendanceDialogProps {
  id: string
  dateStr: string        // YYYY-MM-DD in Bratislava TZ
  clockIn: string        // HH:MM
  clockOut: string       // HH:MM
  note: string | null
}

export function EditAttendanceDialog({ id, dateStr, clockIn, clockOut, note }: EditAttendanceDialogProps) {
  const [open, setOpen] = useState(false)
  const [newClockIn, setNewClockIn] = useState(clockIn)
  const [newClockOut, setNewClockOut] = useState(clockOut)
  const [newNote, setNewNote] = useState(note ?? "")
  const [isPending, startTransition] = useTransition()

  function handleOpen() {
    setNewClockIn(clockIn)
    setNewClockOut(clockOut)
    setNewNote(note ?? "")
    setOpen(true)
  }

  function handleSubmit() {
    startTransition(async () => {
      await updateOwnAttendance(id, dateStr, newClockIn, newClockOut, newNote.trim() || null)
      setOpen(false)
    })
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-muted-foreground hover:text-foreground"
        onClick={handleOpen}
      >
        <Pencil className="size-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Upraviť výkaz</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-clockIn">Príchod</Label>
                <Input
                  id="edit-clockIn"
                  type="time"
                  value={newClockIn}
                  onChange={(e) => setNewClockIn(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-clockOut">Odchod</Label>
                <Input
                  id="edit-clockOut"
                  type="time"
                  value={newClockOut}
                  onChange={(e) => setNewClockOut(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-note">Poznámka</Label>
              <Textarea
                id="edit-note"
                placeholder="Voliteľná poznámka…"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Zrušiť
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Ukladá sa…" : "Uložiť"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
