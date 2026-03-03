import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"
import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"

const handler = toNextJsHandler(auth)

export function GET(req: NextRequest) {
  return handler.GET(req)
}

export async function POST(req: NextRequest) {
  const isSignIn = req.nextUrl.pathname.endsWith("/sign-in/email")

  if (isSignIn) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const { allowed, retryAfterMs } = checkRateLimit(ip)

    if (!allowed) {
      return NextResponse.json(
        { error: "Príliš veľa pokusov. Skúste znova neskôr." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
        },
      )
    }
  }

  return handler.POST(req)
}
