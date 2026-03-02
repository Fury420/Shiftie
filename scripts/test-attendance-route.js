#!/usr/bin/env node
/**
 * Test či request na /attendance dosiahne Next.js (getSession).
 *
 * Spusti VNÚTRI Coolify kontajnera (ak máš kód/scripts):
 *   node scripts/test-attendance-route.js
 *   node scripts/test-attendance-route.js 3000
 *
 * Ak v kontajneri nemáš tento súbor, spusti jeden riadok (bez curl):
 *   node -e "require('http').get('http://127.0.0.1:3000/attendance',r=>{console.log('HTTP',r.statusCode,'Redirect',r.headers.location);r.on('data',()=>{})})"
 *
 * V Coolify logoch hľadaj [getSession] – ak sa objaví, request došiel do Next.js.
 */

const http = require("http")
const port = parseInt(process.argv[2] || "3000", 10)
const url = `http://127.0.0.1:${port}/attendance`

console.log("Request:", url)

const req = http.get(url, (res) => {
  console.log("HTTP status:", res.statusCode)
  console.log("Headers:", JSON.stringify(res.headers, null, 2))
  let body = ""
  res.on("data", (chunk) => { body += chunk })
  res.on("end", () => {
    console.log("Body (first 300 chars):", body.slice(0, 300))
    if (res.headers.location) console.log("Redirect to:", res.headers.location)
  })
})

req.on("error", (err) => {
  console.error("Error:", err.message)
  process.exit(1)
})

req.setTimeout(5000, () => {
  req.destroy()
  console.error("Timeout")
  process.exit(1)
})
