"use server";

import { db } from "@/lib/db";
import { organizations, factories, userFactories } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import { eq } from "drizzle-orm";

export async function createFactory(data: {
  name: string;
  type: string;
  code?: string;
}) {
  const user = await requireAuth();

  const userOrgs = await db.query.userFactories.findMany({
    where: eq(userFactories.userId, user.id),
    with: { factory: { with: { organization: true } } },
  });

  let orgId: string;

  if (userOrgs.length > 0) {
    orgId = userOrgs[0].factory.organizationId;
  } else {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const [org] = await db
      .insert(organizations)
      .values({ name: data.name, slug })
      .returning({ id: organizations.id });
    orgId = org.id;
  }

  const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const [factory] = await db
    .insert(factories)
    .values({
      organizationId: orgId,
      name: data.name,
      slug,
      type: data.type,
      code: data.code || slug.toUpperCase().slice(0, 10),
      config: {},
    })
    .returning({ id: factories.id });

  await db.insert(userFactories).values({
    userId: user.id,
    factoryId: factory.id,
    role: "admin",
  });

  return factory.id;
}
