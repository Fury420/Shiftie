import { headers } from "next/headers"
import { auth } from "./auth"

export async function getSession() {
  const reqHeaders = await headers()
  const cookie = reqHeaders.get("cookie")
  console.log("[getSession] START cookie present:", !!cookie)
  try {
    const t0 = Date.now()
    const session = await auth.api.getSession({ headers: reqHeaders })
    console.log("[getSession] DONE in", Date.now() - t0, "ms result:", session ? `user=${session.user.email}` : "null")
    return session
  } catch (error) {
    console.error("[getSession] ERROR:", error)
    return null
  }
}
