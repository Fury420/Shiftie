import { headers } from "next/headers"
import { auth } from "./auth"

export async function getSession() {
  const reqHeaders = await headers()
  return auth.api.getSession({ headers: reqHeaders })
}
