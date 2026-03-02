import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"
import { NextRequest } from "next/server"

const handler = toNextJsHandler(auth)

export async function GET(req: NextRequest) {
  console.log("[AUTH GET]", req.nextUrl.pathname)
  return handler.GET(req)
}

export async function POST(req: NextRequest) {
  console.log("[AUTH POST]", req.nextUrl.pathname)
  const res = await handler.POST(req)
  console.log("[AUTH POST] response status:", res.status)
  return res
}
