"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Send, Check, Loader2, ChevronDown, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { updateEmployeeTemplate, generateDefaultRange } from "@/app/actions/schedule"

export interface EmployeeTemplate {
  id: string
  name: string
  defaultDays: string
  defaultStartTime: string
  defaultEndTime: string
}

const DAYS = [
  { label: "Po", value: 1 },
  { label: "Ut", value: 2 },
  { label: "St", value: 3 },
  { label: "Št", value: 4 },
  { label: "Pi", value: 5 },
  { label: "So", value: 6 },
  { label: "Ne", value: 0 },
]

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function EmployeeTemplateRow({ employee }: { employee: EmployeeTemplate }) {
  const [days, setDays] = useState<number[]>(
    employee.defaultDays ? employee.defaultDays.split(",").map(Number) : [],
  )
  const [startTime, setStartTime] = useState(employee.defaultStartTime)
  const [endTime, setEndTime] = useState(employee.defaultEndTime)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isDirty =
    days.join(",") !== employee.defaultDays ||
    startTime !== employee.defaultStartTime ||
    endTime !== employee.defaultEndTime

  function toggleDay(v: number) {
    setDays((prev) => prev.includes(v) ? prev.filter((d) => d !== v) : [...prev, v])
    setSaved(false)
  }

  function handleSave() {
    startTransition(async () => {
      await updateEmployeeTemplate(employee.id, {
        defaultDays: days.join(","),
        defaultStartTime: startTime,
        defaultEndTime: endTime,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5">
      <div className="flex items-center gap-2 w-36 shrink-0">
        <Avatar className="size-6">
          <AvatarFallback className="text-[10px]">{initials(employee.name)}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium truncate">{employee.name}</span>
      </div>

      <div className="flex gap-1">
        {DAYS.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => toggleDay(value)}
            className={cn(
              "flex h-7 w-8 items-center justify-center rounded text-xs font-medium transition-colors",
              days.includes(value)
                ? "bg-primary text-primary-foreground"
                : "border hover:bg-muted text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <Input
          type="time"
          value={startTime}
          onChange={(e) => { setStartTime(e.target.value); setSaved(false) }}
          className="h-7 w-24 text-xs px-2"
        />
        <span className="text-muted-foreground text-xs">–</span>
        <Input
          type="time"
          value={endTime}
          onChange={(e) => { setEndTime(e.target.value); setSaved(false) }}
          className="h-7 w-24 text-xs px-2"
        />
      </div>

      <Button
        size="sm"
        variant={saved ? "secondary" : "outline"}
        onClick={handleSave}
        disabled={isPending || (!isDirty && !saved)}
        className="h-7 px-3 text-xs ml-auto"
      >
        {isPending ? (
          <Loader2 className="size-3 animate-spin" />
        ) : saved ? (
          <><Check className="size-3" /> Uložené</>
        ) : (
          "Uložiť"
        )}
      </Button>
    </div>
  )
}

interface TemplatePanelProps {
  employees: EmployeeTemplate[]
  defaultFrom: string
  defaultTo: string
}

export function TemplatePanel({ employees, defaultFrom, defaultTo }: TemplatePanelProps) {
  const router = useRouter()
  const [rangePending, startRangeTransition] = useTransition()
  const [rangeApplied, setRangeApplied] = useState(false)
  const [rangeFrom, setRangeFrom] = useState(defaultFrom)
  const [rangeTo, setRangeTo] = useState(defaultTo)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggleEmployee(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === employees.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(employees.map((e) => e.id)))
    }
  }

  const selectedEmployees = employees.filter((e) => selected.has(e.id))

  function handleApplyRange() {
    if (!rangeFrom || !rangeTo || rangeFrom > rangeTo) return
    startRangeTransition(async () => {
      await generateDefaultRange(rangeFrom, rangeTo)
      router.refresh()
      setRangeApplied(true)
      setTimeout(() => setRangeApplied(false), 2500)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar: employee dropdown + date range + apply */}
      <div className="flex items-center gap-3 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2">
              <Users className="size-3.5" />
              {selected.size === 0
                ? "Vybrať zamestnancov"
                : `${selected.size} ${selected.size === 1 ? "zamestnanec" : selected.size < 5 ? "zamestnanci" : "zamestnancov"}`}
              <ChevronDown className="size-3.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <button
              type="button"
              onClick={toggleAll}
              className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 hover:bg-muted transition-colors"
            >
              <Checkbox
                checked={selected.size === employees.length && employees.length > 0}
                onCheckedChange={toggleAll}
                className="pointer-events-none"
              />
              <span className="text-sm font-medium">Všetci</span>
            </button>
            <div className="my-1 border-t" />
            <div className="flex flex-col max-h-56 overflow-y-auto">
              {employees.map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => toggleEmployee(emp.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
                    selected.has(emp.id) ? "bg-primary/10" : "hover:bg-muted",
                  )}
                >
                  <Checkbox
                    checked={selected.has(emp.id)}
                    onCheckedChange={() => toggleEmployee(emp.id)}
                    className="pointer-events-none"
                  />
                  <Avatar className="size-5">
                    <AvatarFallback className="text-[9px]">{initials(emp.name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate">{emp.name}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-1.5 ml-auto">
          <Label className="text-xs text-muted-foreground shrink-0">Obdobie:</Label>
          <Input
            type="date"
            value={rangeFrom}
            onChange={(e) => setRangeFrom(e.target.value)}
            className="h-8 w-34 text-xs px-2"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            type="date"
            value={rangeTo}
            min={rangeFrom}
            onChange={(e) => setRangeTo(e.target.value)}
            className="h-8 w-34 text-xs px-2"
          />
          <Button
            onClick={handleApplyRange}
            disabled={rangePending || !rangeFrom || !rangeTo || rangeFrom > rangeTo}
            size="sm"
            className="h-8 px-3 text-xs"
          >
            {rangePending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : rangeApplied ? (
              <><Check className="size-3" /> Aplikované</>
            ) : (
              <><Send className="size-3" /> Aplikovať</>
            )}
          </Button>
        </div>
      </div>

      {/* Employee template rows */}
      {selectedEmployees.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Vyber zamestnancov cez tlačidlo vyššie
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto max-h-[55vh]">
          {selectedEmployees.map((emp) => (
            <EmployeeTemplateRow key={emp.id} employee={emp} />
          ))}
        </div>
      )}
    </div>
  )
}
