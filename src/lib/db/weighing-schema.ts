import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  date,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { factories, users, materials, products } from "./schema";

export const weighings = pgTable(
  "weighings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    factoryId: uuid("factory_id")
      .notNull()
      .references(() => factories.id),
    materialId: uuid("material_id").references(() => materials.id),
    date: date("date").notNull(),
    month: varchar("month", { length: 7 }).notNull(),
    weightKg: decimal("weight_kg", { precision: 12, scale: 4 }).notNull(),
    photoUrl: text("photo_url"),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("weighing_factory_month").on(t.factoryId, t.month)]
);

export const losses = pgTable(
  "losses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    factoryId: uuid("factory_id")
      .notNull()
      .references(() => factories.id),
    productId: uuid("product_id").references(() => products.id),
    materialId: uuid("material_id").references(() => materials.id),
    date: date("date").notNull(),
    month: varchar("month", { length: 7 }).notNull(),
    weightKg: decimal("weight_kg", { precision: 12, scale: 4 }).notNull(),
    reason: text("reason"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("loss_factory_month").on(t.factoryId, t.month)]
);

export const weighingsRelations = relations(weighings, ({ one }) => ({
  factory: one(factories, { fields: [weighings.factoryId], references: [factories.id] }),
  material: one(materials, { fields: [weighings.materialId], references: [materials.id] }),
  createdByUser: one(users, { fields: [weighings.createdBy], references: [users.id] }),
}));

export const lossesRelations = relations(losses, ({ one }) => ({
  factory: one(factories, { fields: [losses.factoryId], references: [factories.id] }),
  product: one(products, { fields: [losses.productId], references: [products.id] }),
  material: one(materials, { fields: [losses.materialId], references: [materials.id] }),
  createdByUser: one(users, { fields: [losses.createdBy], references: [users.id] }),
}));
