"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { authClient } from "@/lib/auth-client"

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#84cc16",
  "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
  "#8b5cf6", "#a855f7", "#ec4899", "#64748b",
]

interface ProfileSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentColor: string | null | undefined
}

export function ProfileSettingsDialog({
  open,
  onOpenChange,
  currentColor,
}: ProfileSettingsDialogProps) {
  const router = useRouter()

  const [selectedColor, setSelectedColor] = useState(currentColor ?? PRESET_COLORS[7])
  const [colorSaving, setColorSaving] = useState(false)
  const [colorSaved, setColorSaved] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordSaved, setPasswordSaved] = useState(false)

  useEffect(() => {
    if (currentColor) setSelectedColor(currentColor)
  }, [currentColor])

  useEffect(() => {
    if (!open) {
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setPasswordError("")
      setColorSaved(false)
      setPasswordSaved(false)
    }
  }, [open])

  async function saveColor() {
    setColorSaving(true)
    setColorSaved(false)
    try {
      await (authClient as any).updateUser({ color: selectedColor })
      setColorSaved(true)
      router.refresh()
    } finally {
      setColorSaving(false)
    }
  }

  async function savePassword() {
    setPasswordError("")
    setPasswordSaved(false)

    if (newPassword !== confirmPassword) {
      setPasswordError("Heslá sa nezhodujú")
      return
    }
    if (newPassword.length < 8) {
      setPasswordError("Heslo musí mať aspoň 8 znakov")
      return
    }

    setPasswordSaving(true)
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      })
      if (error) {
        setPasswordError("Nesprávne aktuálne heslo")
      } else {
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setPasswordSaved(true)
      }
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nastavenia profilu</DialogTitle>
        </DialogHeader>

        {/* ── Color picker ─────────────────────────────── */}
        <div className="space-y-3">
          <Label>Farba profilu</Label>
          <div className="grid grid-cols-6 gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                title={color}
                className="relative size-8 rounded-full transition-transform focus:outline-none"
                style={{
                  backgroundColor: color,
                  transform: selectedColor === color ? "scale(1.18)" : "scale(1)",
                  boxShadow:
                    selectedColor === color
                      ? `0 0 0 2px white, 0 0 0 4px ${color}`
                      : "none",
                }}
                onClick={() => setSelectedColor(color)}
              >
                {selectedColor === color && (
                  <Check className="absolute inset-0 m-auto size-4 text-white drop-shadow" />
                )}
              </button>
            ))}
          </div>
          <Button onClick={saveColor} disabled={colorSaving} size="sm">
            {colorSaved ? "Uložené ✓" : colorSaving ? "Ukladám…" : "Uložiť farbu"}
          </Button>
        </div>

        <Separator />

        {/* ── Password change ──────────────────────────── */}
        <div className="space-y-3">
          <Label>Zmeniť heslo</Label>
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Aktuálne heslo"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
            <Input
              type="password"
              placeholder="Nové heslo"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <Input
              type="password"
              placeholder="Potvrdiť nové heslo"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
          </div>
          <Button onClick={savePassword} disabled={passwordSaving} size="sm">
            {passwordSaved ? "Heslo zmenené ✓" : passwordSaving ? "Ukladám…" : "Zmeniť heslo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
