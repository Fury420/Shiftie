"use client"

import { useTransition } from "react"
import { Shield, X } from "lucide-react"
import { stopImpersonating } from "@/app/actions/organizations"

export function ImpersonationBanner({ orgName }: { orgName: string }) {
  const [isPending, startTransition] = useTransition()

  function handleStop() {
    startTransition(async () => {
      await stopImpersonating()
    })
  }

  return (
    <div className="flex items-center gap-2 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-600 dark:text-amber-400">
      <Shield className="size-3.5 shrink-0" />
      <span className="flex-1">
        Superadmin · prezeráte organizáciu <strong>{orgName}</strong>
      </span>
      <button
        onClick={handleStop}
        disabled={isPending}
        className="flex items-center gap-1 rounded px-2 py-0.5 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
      >
        <X className="size-3" />
        Ukončiť
      </button>
    </div>
  )
}
