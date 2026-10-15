"use server";

import { db } from "@/lib/db";
import {
  materials,
  materialEntries,
  materialConsumptions,
  materialBalances,
} from "@/lib/db/schema";
import { requireAuth, requireFactoryAccess } from "@/lib/auth-utils";
import { eq, and, sql, lte, gte } from "drizzle-orm";

type MonthBalance = {
  materialId: string;
  materialName: string;
  openingKg: number;
  entriesKg: number;
  entriesValue: number;
  consumptionKg: number;
  closingKg: number;
  avgPrice: number;
};

export async function getStockBalance(
  factoryId: string,
  month: string
): Promise<MonthBalance[]> {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId);

  const mats = await db.query.materials.findMany({
    where: eq(materials.factoryId, factoryId),
    orderBy: (m, { asc }) => [asc(m.name)],
  });

  const results: MonthBalance[] = [];

  for (const mat of mats) {
    // Entries in this month
    const entriesResult = await db
      .select({
        totalKg: sql<string>`coalesce(sum(${materialEntries.weightKg}), 0)`,
        totalValue: sql<string>`coalesce(sum(${materialEntries.totalValue}), 0)`,
      })
      .from(materialEntries)
      .where(
        and(
          eq(materialEntries.factoryId, factoryId),
          eq(materialEntries.materialId, mat.id),
          eq(materialEntries.month, month)
        )
      );

    // Consumption in this month
    const consumptionResult = await db
      .select({
        totalKg: sql<string>`coalesce(sum(${materialConsumptions.weightKg}), 0)`,
      })
      .from(materialConsumptions)
      .where(
        and(
          eq(materialConsumptions.factoryId, factoryId),
          eq(materialConsumptions.materialId, mat.id),
          eq(materialConsumptions.month, month)
        )
      );

    // All entries before this month (for opening balance)
    const prevEntriesResult = await db
      .select({
        totalKg: sql<string>`coalesce(sum(${materialEntries.weightKg}), 0)`,
      })
      .from(materialEntries)
      .where(
        and(
          eq(materialEntries.factoryId, factoryId),
          eq(materialEntries.materialId, mat.id),
          sql`${materialEntries.month} < ${month}`
        )
      );

    // All consumption before this month
    const prevConsumptionResult = await db
      .select({
        totalKg: sql<string>`coalesce(sum(${materialConsumptions.weightKg}), 0)`,
      })
      .from(materialConsumptions)
      .where(
        and(
          eq(materialConsumptions.factoryId, factoryId),
          eq(materialConsumptions.materialId, mat.id),
          sql`${materialConsumptions.month} < ${month}`
        )
      );

    // Check for manual opening balance override
    const manualBalance = await db.query.materialBalances.findFirst({
      where: and(
        eq(materialBalances.factoryId, factoryId),
        eq(materialBalances.materialId, mat.id),
        eq(materialBalances.month, month)
      ),
    });

    const prevEntries = Number(prevEntriesResult[0].totalKg);
    const prevConsumption = Number(prevConsumptionResult[0].totalKg);
    const openingKg = manualBalance
      ? Number(manualBalance.weightKg)
      : prevEntries - prevConsumption;

    const entriesKg = Number(entriesResult[0].totalKg);
    const entriesValue = Number(entriesResult[0].totalValue);
    const consumptionKg = Number(consumptionResult[0].totalKg);
    const closingKg = openingKg + entriesKg - consumptionKg;

    // Average price: total value / total kg for ALL entries of this material
    const allEntriesResult = await db
      .select({
        totalKg: sql<string>`coalesce(sum(${materialEntries.weightKg}), 0)`,
        totalValue: sql<string>`coalesce(sum(${materialEntries.totalValue}), 0)`,
      })
      .from(materialEntries)
      .where(
        and(
          eq(materialEntries.factoryId, factoryId),
          eq(materialEntries.materialId, mat.id),
          sql`${materialEntries.month} <= ${month}`
        )
      );

    const allKg = Number(allEntriesResult[0].totalKg);
    const allValue = Number(allEntriesResult[0].totalValue);
    const avgPrice = allKg > 0 ? allValue / allKg : 0;

    results.push({
      materialId: mat.id,
      materialName: mat.name,
      openingKg,
      entriesKg,
      entriesValue,
      consumptionKg,
      closingKg,
      avgPrice,
    });
  }

  return results;
}

export async function getStockAnnual(
  factoryId: string,
  year: string
): Promise<{ month: string; balances: MonthBalance[] }[]> {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId);

  const months = Array.from({ length: 12 }, (_, i) => {
    const m = (i + 1).toString().padStart(2, "0");
    return `${year}-${m}`;
  });

  const result: { month: string; balances: MonthBalance[] }[] = [];

  for (const month of months) {
    const balances = await getStockBalance(factoryId, month);
    result.push({ month, balances });
  }

  return result;
}

export async function getConsumptionsByMonth(
  factoryId: string,
  month: string
) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId);

  return db.query.materialConsumptions.findMany({
    where: and(
      eq(materialConsumptions.factoryId, factoryId),
      eq(materialConsumptions.month, month)
    ),
    with: {
      material: true,
      productionEntry: { with: { product: true } },
    },
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });
}
