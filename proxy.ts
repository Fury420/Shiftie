import { NextRequest, NextResponse } from "next/server"

const protectedRoutes = ["/attendance", "/schedule", "/leaves", "/admin", "/zastup"]
const authRoutes = ["/login"]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session =
    request.cookies.get("__Secure-better-auth.session_token") ||
    request.cookies.get("better-auth.session_token")

  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r))
  const isAuthRoute = authRoutes.some((r) => pathname.startsWith(r))

  if (isProtected && !session) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
