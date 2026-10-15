"use server";

import { db } from "@/lib/db";
import { productionEntries, materialEntries, expenses } from "@/lib/db/schema";
import { losses, weighings } from "@/lib/db/weighing-schema";
import { requireAuth, requireFactoryAccess } from "@/lib/auth-utils";
import { eq, and, sql, desc } from "drizzle-orm";

export async function getDashboardData(factoryId: string, month: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId);

  const [prodResult, matResult, expResult, lossResult, lastWeighing, dailyProd] =
    await Promise.all([
      db
        .select({
          totalKg: sql<string>`coalesce(sum(${productionEntries.weightKg}), '0')`,
          count: sql<number>`count(*)::int`,
        })
        .from(productionEntries)
        .where(and(eq(productionEntries.factoryId, factoryId), eq(productionEntries.month, month))),

      db
        .select({
          totalKg: sql<string>`coalesce(sum(${materialEntries.weightKg}), '0')`,
          totalValue: sql<string>`coalesce(sum(${materialEntries.totalValue}), '0')`,
        })
        .from(materialEntries)
        .where(and(eq(materialEntries.factoryId, factoryId), eq(materialEntries.month, month))),

      db
        .select({
          total: sql<string>`coalesce(sum(${expenses.value}), '0')`,
          count: sql<number>`count(*)::int`,
        })
        .from(expenses)
        .where(and(eq(expenses.factoryId, factoryId), eq(expenses.month, month))),

      db
        .select({
          totalKg: sql<string>`coalesce(sum(${losses.weightKg}), '0')`,
        })
        .from(losses)
        .where(and(eq(losses.factoryId, factoryId), eq(losses.month, month))),

      db.query.weighings.findFirst({
        where: eq(weighings.factoryId, factoryId),
        orderBy: (w, { desc }) => [desc(w.date)],
      }),

      db
        .select({
          date: productionEntries.date,
          totalKg: sql<string>`sum(${productionEntries.weightKg})`,
        })
        .from(productionEntries)
        .where(and(eq(productionEntries.factoryId, factoryId), eq(productionEntries.month, month)))
        .groupBy(productionEntries.date)
        .orderBy(productionEntries.date),
    ]);

  const prodKg = Number(prodResult[0].totalKg);
  const lossKg = Number(lossResult[0].totalKg);
  const lossIndex = prodKg > 0 ? (lossKg / prodKg) * 100 : 0;

  return {
    production: { totalKg: prodKg, count: prodResult[0].count },
    materialEntries: {
      totalKg: Number(matResult[0].totalKg),
      totalValue: Number(matResult[0].totalValue),
    },
    expenses: { total: Number(expResult[0].total), count: expResult[0].count },
    losses: { totalKg: lossKg, index: lossIndex },
    lastWeighing: lastWeighing
      ? { weightKg: Number(lastWeighing.weightKg), date: lastWeighing.date }
      : null,
    dailyProduction: dailyProd.map((d) => ({
      date: d.date,
      kg: Number(d.totalKg),
    })),
  };
}
