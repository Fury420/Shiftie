import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface ScheduleDay {
  date: string      // YYYY-MM-DD
  dateLabel: string // "Po 24. 2."
  isToday: boolean
  shifts: {
    id: string
    startTime: string
    endTime: string
    note: string | null
  }[]
}

interface EmployeeScheduleViewProps {
  days: ScheduleDay[]
  weekLabel: string
  prevWeek: string
  nextWeek: string
}

export function EmployeeScheduleView({
  days,
  weekLabel,
  prevWeek,
  nextWeek,
}: EmployeeScheduleViewProps) {
  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <h1 className="text-2xl font-semibold">Plán smien</h1>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/schedule?from=${prevWeek}`}>
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <span className="text-sm font-medium min-w-48 text-center">{weekLabel}</span>
        <Button variant="outline" size="icon" asChild>
          <Link href={`/schedule?from=${nextWeek}`}>
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {days.map((day) => (
          <div
            key={day.date}
            className={`flex items-start gap-4 rounded-lg border px-4 py-3 ${
              day.isToday ? "border-primary bg-primary/5" : ""
            }`}
          >
            <div className="w-24 shrink-0">
              <p className={`text-sm font-medium ${day.isToday ? "text-primary" : ""}`}>
                {day.dateLabel}
                {day.isToday && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">dnes</span>
                )}
              </p>
            </div>

            <div className="flex flex-col gap-1">
              {day.shifts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Voľno</p>
              ) : (
                day.shifts.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {s.startTime} – {s.endTime}
                    </Badge>
                    {s.note && (
                      <span className="text-xs text-muted-foreground">{s.note}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
