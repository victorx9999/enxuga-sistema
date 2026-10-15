"use server";

import { db } from "@/lib/db";
import { losses } from "@/lib/db/weighing-schema";
import { requireAuth, requireFactoryAccess } from "@/lib/auth-utils";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getLosses(factoryId: string, month?: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId);

  const conditions = [eq(losses.factoryId, factoryId)];
  if (month) conditions.push(eq(losses.month, month));

  return db.query.losses.findMany({
    where: and(...conditions),
    with: { product: true, material: true, createdByUser: true },
    orderBy: (e, { desc }) => [desc(e.date)],
  });
}

export async function createLoss(
  factoryId: string,
  data: {
    productId?: string;
    materialId?: string;
    date: string;
    month: string;
    weightKg: string;
    reason?: string;
  }
) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId, "operator");

  const [loss] = await db
    .insert(losses)
    .values({ factoryId, ...data, createdBy: user.id })
    .returning();

  revalidatePath("/losses");
  return loss;
}

export async function deleteLoss(lossId: string, factoryId: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId, "manager");

  await db.delete(losses).where(
    and(eq(losses.id, lossId), eq(losses.factoryId, factoryId))
  );

  revalidatePath("/losses");
}

export async function getLossSummary(factoryId: string, month: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId);

  const result = await db
    .select({
      totalKg: sql<string>`coalesce(sum(${losses.weightKg}), '0')`,
      count: sql<number>`count(*)::int`,
    })
    .from(losses)
    .where(and(eq(losses.factoryId, factoryId), eq(losses.month, month)));

  return result[0];
}
