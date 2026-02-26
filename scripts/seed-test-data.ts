import { config } from "dotenv"
config({ path: ".env.local" })

// Dnešný dátum: 2026-02-26 (štvrtok)
// Minulý týždeň:      Po 16.2 – Ne 22.2
// Predminulý týždeň:  Po  9.2 – Ne 15.2

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0=Ne, 1=Po ...
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Vráti dátumy pracovných dní týždňa podľa defaultDays (0=Ne..6=So)
// Ak nie sú nastavené, použije Po-Pi (1-5)
function getWorkDays(monday: Date, defaultDays: string | null): Date[] {
  const days = defaultDays
    ? defaultDays.split(",").map(Number).filter(n => !isNaN(n))
    : [1, 2, 3, 4, 5]
  return days.map(dayNum => {
    // dayNum: 0=Ne,1=Po,...,6=So; monday je deň 1
    const offset = dayNum === 0 ? 6 : dayNum - 1
    return addDays(monday, offset)
  })
}

async function main() {
  const { db } = await import("../db")
  const { user, shifts, attendance } = await import("../db/schema")

  const employees = await db
    .select({
      id: user.id,
      name: user.name,
      defaultDays: user.defaultDays,
      defaultStartTime: user.defaultStartTime,
      defaultEndTime: user.defaultEndTime,
    })
    .from(user)

  if (employees.length === 0) {
    console.error("Žiadni používatelia v DB. Najprv spusti seed:admin.")
    process.exit(1)
  }

  const today = new Date()
  const thisMonday = getMondayOf(today)
  const lastMonday = addDays(thisMonday, -7)
  const prevMonday = addDays(thisMonday, -14)

  const weeks = [prevMonday, lastMonday]

  let shiftCount = 0
  let attendanceCount = 0

  for (const emp of employees) {
    const startTime = emp.defaultStartTime ?? "09:00:00"
    const endTime = emp.defaultEndTime ?? "17:00:00"

    for (const monday of weeks) {
      const workDays = getWorkDays(monday, emp.defaultDays)

      for (const day of workDays) {
        // Nepridávaj budúce dni
        if (day >= today) continue

        const dateStr = toDateStr(day)

        // Vytvor smenu
        const [shift] = await db
          .insert(shifts)
          .values({
            userId: emp.id,
            date: dateStr,
            startTime,
            endTime,
            status: "published",
          })
          .returning({ id: shifts.id })

        shiftCount++

        // Vytvor dochádzku: clockIn = dátum + startTime, clockOut = dátum + endTime
        const [startH, startM] = startTime.split(":").map(Number)
        const [endH, endM] = endTime.split(":").map(Number)

        const clockIn = new Date(day)
        clockIn.setHours(startH, startM + Math.floor(Math.random() * 5), 0, 0) // ±0-5 min

        const clockOut = new Date(day)
        clockOut.setHours(endH, endM - Math.floor(Math.random() * 10), 0, 0)   // ±0-10 min skôr

        await db.insert(attendance).values({
          userId: emp.id,
          shiftId: shift.id,
          clockIn,
          clockOut,
        })

        attendanceCount++
      }
    }
  }

  console.log(`✓ Vytvorených ${shiftCount} smien a ${attendanceCount} záznamov dochádzky`)
  console.log(`  Pokrytí zamestnanci: ${employees.map(e => e.name).join(", ")}`)
  console.log(`  Týždne: ${toDateStr(prevMonday)} – ${toDateStr(addDays(prevMonday, 6))}`)
  console.log(`           ${toDateStr(lastMonday)} – ${toDateStr(addDays(lastMonday, 6))}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => process.exit(0))
