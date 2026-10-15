"use server";

import { db } from "@/lib/db";
import { users, userFactories } from "@/lib/db/schema";
import { requireAuth, requireFactoryAccess } from "@/lib/auth-utils";
import { eq, and } from "drizzle-orm";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function getFactoryUsers(factoryId: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId, "manager");

  const result = await db.query.userFactories.findMany({
    where: eq(userFactories.factoryId, factoryId),
    with: { user: true },
    orderBy: (uf, { asc }) => [asc(uf.role)],
  });

  return result.map((uf) => ({
    id: uf.user.id,
    name: uf.user.name,
    email: uf.user.email,
    active: uf.user.active,
    role: uf.role,
    userFactoryId: uf.id,
    createdAt: uf.user.createdAt,
  }));
}

export async function createUser(
  factoryId: string,
  data: { name: string; email: string; password: string; role: "admin" | "manager" | "operator" }
) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId, "admin");

  const passwordHash = await hash(data.password, 12);

  const [newUser] = await db
    .insert(users)
    .values({ name: data.name, email: data.email, passwordHash })
    .onConflictDoNothing()
    .returning();

  if (!newUser) {
    const existing = await db.query.users.findFirst({ where: eq(users.email, data.email) });
    if (!existing) throw new Error("Erro ao criar usuário");

    await db
      .insert(userFactories)
      .values({ userId: existing.id, factoryId, role: data.role })
      .onConflictDoNothing();

    revalidatePath("/users");
    return existing;
  }

  await db.insert(userFactories).values({ userId: newUser.id, factoryId, role: data.role });

  revalidatePath("/users");
  return newUser;
}

export async function updateUserRole(
  userFactoryId: string,
  factoryId: string,
  role: "admin" | "manager" | "operator"
) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId, "admin");

  await db
    .update(userFactories)
    .set({ role })
    .where(and(eq(userFactories.id, userFactoryId), eq(userFactories.factoryId, factoryId)));

  revalidatePath("/users");
}

export async function toggleUserActive(userId: string, factoryId: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId, "admin");

  const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!target) throw new Error("Usuário não encontrado");

  await db.update(users).set({ active: !target.active }).where(eq(users.id, userId));

  revalidatePath("/users");
}

export async function removeUserFromFactory(userFactoryId: string, factoryId: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId, "admin");

  await db
    .delete(userFactories)
    .where(and(eq(userFactories.id, userFactoryId), eq(userFactories.factoryId, factoryId)));

  revalidatePath("/users");
}
