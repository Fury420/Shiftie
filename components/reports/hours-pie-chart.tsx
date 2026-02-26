"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"

export interface HourSlice {
  name: string
  minutes: number
  color: string | null
}

const FALLBACK_COLORS = [
  "#3b82f6", "#22c55e", "#f97316", "#a855f7",
  "#ec4899", "#14b8a6", "#eab308", "#ef4444",
]

function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, "0")}m`
}

interface TooltipPayload {
  name: string
  value: number
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayload[]
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{payload[0].name}</p>
      <p className="text-muted-foreground">{formatHours(payload[0].value)}</p>
    </div>
  )
}

export function HoursPieChart({ data }: { data: HourSlice[] }) {
  const chartData = data.map((d, i) => ({
    ...d,
    resolvedColor: d.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }))

  const totalMinutes = data.reduce((sum, d) => sum + d.minutes, 0)

  return (
    <div className="flex items-center gap-6">
      {/* Donut chart */}
      <div className="relative flex-shrink-0" style={{ width: 180, height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="minutes"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={2}
              strokeWidth={0}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.resolvedColor} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-base font-semibold leading-tight">{formatHours(totalMinutes)}</span>
          <span className="text-xs text-muted-foreground">celkom</span>
        </div>
      </div>

      {/* Legend */}
      <ul className="flex flex-col gap-2.5 text-sm flex-1 min-w-0">
        {chartData.map((entry) => (
          <li key={entry.name} className="flex items-center gap-2">
            <span
              className="inline-block size-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.resolvedColor }}
            />
            <span className="flex-1 truncate">{entry.name}</span>
            <span className="font-mono font-medium tabular-nums">
              {formatHours(entry.minutes)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
