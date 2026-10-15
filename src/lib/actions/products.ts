"use server";

import { db } from "@/lib/db";
import { products, productCompositions, materials } from "@/lib/db/schema";
import { requireAuth, requireFactoryAccess } from "@/lib/auth-utils";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getProducts(factoryId: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId);

  return db.query.products.findMany({
    where: eq(products.factoryId, factoryId),
    with: { compositions: { with: { material: true } } },
    orderBy: (p, { asc }) => [asc(p.name)],
  });
}

export async function createProduct(
  factoryId: string,
  data: { name: string; code?: string; category?: string; unit?: string }
) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId, "manager");

  const [product] = await db
    .insert(products)
    .values({ factoryId, ...data, unit: data.unit ?? "kg" })
    .returning();

  revalidatePath("/products");
  return product;
}

export async function updateProduct(
  productId: string,
  factoryId: string,
  data: { name?: string; code?: string; category?: string }
) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId, "manager");

  const [product] = await db
    .update(products)
    .set(data)
    .where(and(eq(products.id, productId), eq(products.factoryId, factoryId)))
    .returning();

  revalidatePath("/products");
  return product;
}

export async function deleteProduct(productId: string, factoryId: string) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId, "admin");

  await db.delete(productCompositions).where(eq(productCompositions.productId, productId));
  await db.delete(products).where(and(eq(products.id, productId), eq(products.factoryId, factoryId)));

  revalidatePath("/products");
}

export async function setProductCompositions(
  productId: string,
  factoryId: string,
  compositions: { materialId: string; percentage: string }[]
) {
  const user = await requireAuth();
  await requireFactoryAccess(user.id, factoryId, "manager");

  await db.delete(productCompositions).where(eq(productCompositions.productId, productId));

  if (compositions.length > 0) {
    await db.insert(productCompositions).values(
      compositions.map((c) => ({
        productId,
        materialId: c.materialId,
        percentage: c.percentage,
      }))
    );
  }

  revalidatePath("/products");
}
