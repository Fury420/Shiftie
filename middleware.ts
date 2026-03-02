import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Pre page routes (nie /api, nie _next, nie static) nastavíme Cache-Control,
 * aby Cloudflare (a iné CDN) necachovali HTML. Bez toho môže CDN vracať
 * cached redirect na /login a request sa nikdy nedostane do Next.js.
 */
export function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const pathname = request.nextUrl.pathname

  // Iba page routes – API a static sú mimo
  if (!pathname.startsWith("/api") && !pathname.startsWith("/_next")) {
    res.headers.set(
      "Cache-Control",
      "private, no-store, no-cache, must-revalidate, max-age=0",
    )
  }
  return res
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|svg|woff2?)$).*)"],
}
