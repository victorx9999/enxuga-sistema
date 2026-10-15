"use server";

import { db } from "@/lib/db";
import {
  productionEntries,
  productCompositions,
  materialConsumptions,
} from "@/lib/db/schema";
import { requireAuth, requireFactoryAccess } from "@/lib/auth-utils";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getProductionEntries(factoryId: string, month?: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId);

  const conditions = [eq(productionEntries.factoryId, factoryId)];
  if (month) conditions.push(eq(productionEntries.month, month));

  return db.query.productionEntries.findMany({
    where: and(...conditions),
    with: { product: true, createdByUser: true },
    orderBy: (e, { desc }) => [desc(e.date)],
  });
}

export async function createProductionEntry(
  factoryId: string,
  data: {
    productId: string;
    date: string;
    month: string;
    machine?: string;
    weaving?: number;
    weightKg: string;
    rawText?: string;
  }
) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId, "operator");

  const [entry] = await db
    .insert(productionEntries)
    .values({ factoryId, ...data, createdBy: user.id })
    .returning();

  // Auto-consume materials based on product composition
  const compositions = await db.query.productCompositions.findMany({
    where: eq(productCompositions.productId, data.productId),
  });

  if (compositions.length > 0) {
    const weightKg = Number(data.weightKg);
    await db.insert(materialConsumptions).values(
      compositions.map((c) => ({
        factoryId,
        productionEntryId: entry.id,
        materialId: c.materialId,
        month: data.month,
        weightKg: (weightKg * Number(c.percentage)).toFixed(4),
      }))
    );
  }

  revalidatePath("/production");
  revalidatePath("/dashboard");
  revalidatePath("/stock");
  return entry;
}

export async function deleteProductionEntry(entryId: string, factoryId: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId, "manager");

  await db.delete(productionEntries).where(
    and(eq(productionEntries.id, entryId), eq(productionEntries.factoryId, factoryId))
  );

  revalidatePath("/production");
  revalidatePath("/dashboard");
  revalidatePath("/stock");
}

export async function getProductionSummary(factoryId: string, month: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId);

  const result = await db
    .select({
      productId: productionEntries.productId,
      totalKg: sql<string>`sum(${productionEntries.weightKg})`,
      count: sql<number>`count(*)::int`,
    })
    .from(productionEntries)
    .where(
      and(
        eq(productionEntries.factoryId, factoryId),
        eq(productionEntries.month, month)
      )
    )
    .groupBy(productionEntries.productId);

  return result;
}

export async function getProductionByDay(factoryId: string, month: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId);

  const result = await db
    .select({
      date: productionEntries.date,
      totalKg: sql<string>`sum(${productionEntries.weightKg})`,
      count: sql<number>`count(*)::int`,
    })
    .from(productionEntries)
    .where(
      and(
        eq(productionEntries.factoryId, factoryId),
        eq(productionEntries.month, month)
      )
    )
    .groupBy(productionEntries.date)
    .orderBy(productionEntries.date);

  return result;
}
