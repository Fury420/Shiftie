import { NextRequest, NextResponse } from "next/server"

const protectedPaths = ["/attendance", "/schedule", "/zastup", "/admin"]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only check protected routes
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  // Check for session cookie (Better Auth with useSecureCookies)
  const token =
    req.cookies.get("__Secure-better-auth.session_token")?.value ||
    req.cookies.get("better-auth.session_token")?.value

  console.log("[MIDDLEWARE]", pathname, "token:", token ? "present" : "missing")

  if (!token) {
    const loginUrl = new URL("/login", req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/attendance/:path*", "/schedule/:path*", "/zastup/:path*", "/admin/:path*"],
}
