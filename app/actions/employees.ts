"use server"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { user } from "@/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth-guard"

export async function createEmployee(data: {
  name: string
  email: string
  password: string
  role: "admin" | "employee"
  defaultDays: string
  color: string
}) {
  await requireAdmin()

  const result = await auth.api.signUpEmail({
    body: { name: data.name, email: data.email, password: data.password },
  })

  if (!result || "error" in result) {
    throw new Error("Nepodarilo sa vytvoriť účet. Email možno už existuje.")
  }

  await db
    .update(user)
    .set({ role: data.role, emailVerified: true, defaultDays: data.defaultDays || null, color: data.color || null })
    .where(eq(user.email, data.email))

  revalidatePath("/admin/employees")
}

export async function updateEmployee(
  id: string,
  data: { name: string; role: "admin" | "employee"; defaultDays: string; color: string },
) {
  await requireAdmin()

  await db
    .update(user)
    .set({ name: data.name, role: data.role, defaultDays: data.defaultDays || null, color: data.color || null, updatedAt: new Date() })
    .where(eq(user.id, id))

  revalidatePath("/admin/employees")
}

export async function deleteEmployee(id: string) {
  const session = await requireAdmin()

  if (session.user.id === id) {
    throw new Error("Nemôžeš zmazať sám seba.")
  }

  await db.delete(user).where(eq(user.id, id))

  revalidatePath("/admin/employees")
}

export async function archiveEmployee(id: string) {
  const session = await requireAdmin()

  if (session.user.id === id) {
    throw new Error("Nemôžeš archivovať sám seba.")
  }

  await db
    .update(user)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(user.id, id))

  revalidatePath("/admin/employees")
}

export async function unarchiveEmployee(id: string) {
  await requireAdmin()

  await db
    .update(user)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(eq(user.id, id))

  revalidatePath("/admin/employees")
}
