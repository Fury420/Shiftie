import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  console.log("[DEBUG] /api/debug-session called")
  console.log("[DEBUG] cookies:", req.cookies.getAll().map(c => c.name).join(", "))

  try {
    const session = await auth.api.getSession({ headers: req.headers })
    console.log("[DEBUG] session:", session ? `user=${session.user.email}` : "null")

    return NextResponse.json({
      hasSession: !!session,
      user: session?.user?.email ?? null,
      cookieNames: req.cookies.getAll().map(c => c.name),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[DEBUG] error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
