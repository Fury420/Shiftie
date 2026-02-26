"use client"

import { useEffect, useState, useTransition } from "react"
import { LogIn, LogOut, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { clockIn, clockOut } from "@/app/actions/attendance"

interface ClockCardProps {
  isActive: boolean
  clockInTime: string | null // ISO string
}

function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return [h, m, sec].map((v) => String(v).padStart(2, "0")).join(":")
}

export function ClockCard({ isActive, clockInTime }: ClockCardProps) {
  const [elapsed, setElapsed] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!isActive || !clockInTime) {
      setElapsed(null)
      return
    }
    const start = new Date(clockInTime).getTime()
    const tick = () => setElapsed(formatElapsed(Date.now() - start))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isActive, clockInTime])

  const today = new Date().toLocaleDateString("sk-SK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const clockInFormatted = clockInTime
    ? new Date(clockInTime).toLocaleTimeString("sk-SK", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  function handle() {
    startTransition(async () => {
      if (isActive) {
        await clockOut()
      } else {
        await clockIn()
      }
    })
  }

  return (
    <Card>
      <CardContent className="pt-6 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm text-muted-foreground capitalize">{today}</p>
            {isActive && clockInFormatted && (
              <p className="text-sm text-muted-foreground">
                Príchod: <span className="font-medium text-foreground">{clockInFormatted}</span>
              </p>
            )}
          </div>

          {isActive && elapsed && (
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-green-500 shrink-0" />
              <span className="text-2xl font-mono font-semibold tabular-nums">{elapsed}</span>
            </div>
          )}
        </div>

        <Button
          onClick={handle}
          disabled={isPending}
          variant={isActive ? "destructive" : "default"}
          size="lg"
          className="w-full sm:w-48"
        >
          {isActive ? (
            <>
              <LogOut className="size-4" />
              {isPending ? "Odhlasovanie…" : "Odhlásiť sa"}
            </>
          ) : (
            <>
              <LogIn className="size-4" />
              {isPending ? "Prihlasovanie…" : "Prihlásiť sa"}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
