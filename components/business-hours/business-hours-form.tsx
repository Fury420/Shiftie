"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { updateBusinessHours } from "@/app/actions/business-hours"
import type { BusinessHoursRow } from "@/app/actions/business-hours"

const DAYS: { label: string; dayOfWeek: string }[] = [
  { label: "Pondelok", dayOfWeek: "1" },
  { label: "Utorok", dayOfWeek: "2" },
  { label: "Streda", dayOfWeek: "3" },
  { label: "Štvrtok", dayOfWeek: "4" },
  { label: "Piatok", dayOfWeek: "5" },
  { label: "Sobota", dayOfWeek: "6" },
  { label: "Nedeľa", dayOfWeek: "0" },
]

function shortTime(t: string | null): string {
  if (!t) return ""
  return t.slice(0, 5)
}

interface BusinessHoursFormProps {
  initial: BusinessHoursRow[]
}

export function BusinessHoursForm({ initial }: BusinessHoursFormProps) {
  const router = useRouter()
  const byDay = new Map(initial.map((r) => [r.dayOfWeek, r]))

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-muted/30 p-4">
      <div>
        <h2 className="text-sm font-semibold">Otváracie hodiny podniku</h2>
        <p className="text-xs text-muted-foreground">
          Nastavte pre každý deň v týždni kedy je podnik otvorený. Bloky zmien v kalendári vychádzajú z týchto hodín.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {DAYS.map(({ label, dayOfWeek }) => (
          <DayRow
            key={dayOfWeek}
            label={label}
            dayOfWeek={dayOfWeek}
            initial={byDay.get(dayOfWeek)}
            onSaved={() => router.refresh()}
          />
        ))}
      </div>
    </div>
  )
}

function DayRow({
  label,
  dayOfWeek,
  initial,
  onSaved,
}: {
  label: string
  dayOfWeek: string
  initial: BusinessHoursRow | undefined
  onSaved: () => void
}) {
  const [isClosed, setIsClosed] = useState(initial?.isClosed ?? true)
  const [openTime, setOpenTime] = useState(shortTime(initial?.openTime ?? null) || "08:00")
  const [closeTime, setCloseTime] = useState(shortTime(initial?.closeTime ?? null) || "22:00")
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const initialClosed = initial?.isClosed ?? true
  const initialOpen = shortTime(initial?.openTime ?? null) || "08:00"
  const initialClose = shortTime(initial?.closeTime ?? null) || "22:00"
  const isDirty =
    isClosed !== initialClosed ||
    openTime !== initialOpen ||
    closeTime !== initialClose

  function handleSave() {
    startTransition(async () => {
      await updateBusinessHours(dayOfWeek, {
        isClosed,
        openTime: isClosed ? null : openTime,
        closeTime: isClosed ? null : closeTime,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onSaved()
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-background px-4 py-3">
      <div className="w-28 shrink-0 font-medium text-sm">{label}</div>
      <div className="flex items-center gap-2">
        <Switch
          id={`closed-${dayOfWeek}`}
          checked={!isClosed}
          onCheckedChange={(checked) => setIsClosed(!checked)}
        />
        <Label htmlFor={`closed-${dayOfWeek}`} className="text-sm">
          Otvorené
        </Label>
      </div>
      {!isClosed && (
        <>
          <div className="flex items-center gap-1.5">
            <Input
              type="time"
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
              className="h-8 w-28 text-sm"
            />
            <span className="text-muted-foreground text-sm">–</span>
            <Input
              type="time"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              className="h-8 w-28 text-sm"
            />
          </div>
        </>
      )}
      <Button
        size="sm"
        variant={saved ? "secondary" : "outline"}
        onClick={handleSave}
        disabled={isPending || !isDirty}
        className="h-8 px-3 text-sm ml-auto"
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : saved ? (
          <>
            <Check className="size-3.5" /> Uložené
          </>
        ) : (
          "Uložiť"
        )}
      </Button>
    </div>
  )
}
