import { headers } from "next/headers"
import { auth } from "./auth"

export async function getSession() {
  const reqHeaders = await headers()
  const cookie = reqHeaders.get("cookie")
  console.log("[getSession] cookie present:", !!cookie, "cookie preview:", cookie?.substring(0, 80))
  try {
    const session = await auth.api.getSession({ headers: reqHeaders })
    console.log("[getSession] result:", session ? `user=${session.user.email}` : "null")
    return session
  } catch (error) {
    console.error("[getSession] ERROR:", error)
    return null
  }
}
