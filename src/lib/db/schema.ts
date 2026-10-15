import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  integer,
  date,
  jsonb,
  boolean,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "manager",
  "operator",
]);

export const movementTypeEnum = pgEnum("movement_type", [
  "entry",
  "exit",
  "production_consumption",
  "loss",
  "adjustment",
]);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const factories = pgTable(
  "factories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    type: varchar("type", { length: 100 }).notNull(),
    code: varchar("code", { length: 10 }).notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("factory_org_slug").on(t.organizationId, t.slug)]
);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userFactories = pgTable(
  "user_factories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    factoryId: uuid("factory_id")
      .notNull()
      .references(() => factories.id),
    role: userRoleEnum("role").notNull().default("operator"),
  },
  (t) => [uniqueIndex("user_factory_unique").on(t.userId, t.factoryId)]
);

export const materials = pgTable(
  "materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    factoryId: uuid("factory_id")
      .notNull()
      .references(() => factories.id),
    name: varchar("name", { length: 255 }).notNull(),
    unit: varchar("unit", { length: 20 }).notNull().default("kg"),
    averagePrice: decimal("average_price", { precision: 12, scale: 4 }).default(
      "0"
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("material_factory").on(t.factoryId)]
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    factoryId: uuid("factory_id")
      .notNull()
      .references(() => factories.id),
    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 50 }),
    category: varchar("category", { length: 100 }),
    unit: varchar("unit", { length: 20 }).notNull().default("kg"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("product_factory").on(t.factoryId)]
);

export const productCompositions = pgTable(
  "product_compositions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id),
    percentage: decimal("percentage", { precision: 5, scale: 4 }).notNull(),
    month: varchar("month", { length: 7 }),
  },
  (t) => [index("composition_product").on(t.productId)]
);

export const productionEntries = pgTable(
  "production_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    factoryId: uuid("factory_id")
      .notNull()
      .references(() => factories.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    date: date("date").notNull(),
    month: varchar("month", { length: 7 }).notNull(),
    machine: varchar("machine", { length: 50 }),
    weaving: integer("weaving").default(1),
    weightKg: decimal("weight_kg", { precision: 12, scale: 4 }).notNull(),
    rawText: text("raw_text"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("production_factory_month").on(t.factoryId, t.month),
  ]
);

export const materialEntries = pgTable(
  "material_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    factoryId: uuid("factory_id")
      .notNull()
      .references(() => factories.id),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id),
    date: date("date").notNull(),
    month: varchar("month", { length: 7 }).notNull(),
    invoiceNumber: varchar("invoice_number", { length: 100 }),
    fiberType: varchar("fiber_type", { length: 100 }),
    boxes: decimal("boxes", { precision: 10, scale: 2 }),
    kgPerBox: decimal("kg_per_box", { precision: 10, scale: 2 }),
    weightKg: decimal("weight_kg", { precision: 12, scale: 4 }).notNull(),
    invoiceValue: decimal("invoice_value", { precision: 12, scale: 2 }),
    taxPercent: decimal("tax_percent", { precision: 5, scale: 2 }),
    taxValue: decimal("tax_value", { precision: 12, scale: 2 }),
    unitValue: decimal("unit_value", { precision: 12, scale: 4 }),
    totalValue: decimal("total_value", { precision: 12, scale: 2 }),
    paymentDate: date("payment_date"),
    paymentMethod: varchar("payment_method", { length: 100 }),
    paidBy: varchar("paid_by", { length: 255 }),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("material_entry_factory_month").on(t.factoryId, t.month),
  ]
);

export const materialBalances = pgTable(
  "material_balances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    factoryId: uuid("factory_id")
      .notNull()
      .references(() => factories.id),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id),
    month: varchar("month", { length: 7 }).notNull(),
    weightKg: decimal("weight_kg", { precision: 12, scale: 4 }).notNull(),
    boxes: varchar("boxes", { length: 50 }),
    unitValue: decimal("unit_value", { precision: 12, scale: 4 }),
  },
  (t) => [
    uniqueIndex("balance_unique").on(t.factoryId, t.materialId, t.month),
  ]
);

export const materialConsumptions = pgTable(
  "material_consumptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    factoryId: uuid("factory_id")
      .notNull()
      .references(() => factories.id),
    productionEntryId: uuid("production_entry_id")
      .notNull()
      .references(() => productionEntries.id, { onDelete: "cascade" }),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id),
    month: varchar("month", { length: 7 }).notNull(),
    weightKg: decimal("weight_kg", { precision: 12, scale: 4 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("consumption_factory_month").on(t.factoryId, t.month),
    index("consumption_production").on(t.productionEntryId),
  ]
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    factoryId: uuid("factory_id")
      .notNull()
      .references(() => factories.id),
    date: date("date").notNull(),
    month: varchar("month", { length: 7 }).notNull(),
    description: text("description").notNull(),
    value: decimal("value", { precision: 12, scale: 2 }).notNull(),
    paidBy: varchar("paid_by", { length: 255 }),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("expense_factory_month").on(t.factoryId, t.month)]
);

export const costParameters = pgTable("cost_parameters", {
  id: uuid("id").primaryKey().defaultRandom(),
  factoryId: uuid("factory_id")
    .notNull()
    .references(() => factories.id),
  month: varchar("month", { length: 7 }),
  productId: uuid("product_id").references(() => products.id),
  productionCostPerKg: decimal("production_cost_per_kg", {
    precision: 12,
    scale: 4,
  }),
  profitPerKg: decimal("profit_per_kg", { precision: 12, scale: 4 }),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    factoryId: uuid("factory_id").references(() => factories.id),
    userId: uuid("user_id").references(() => users.id),
    action: varchar("action", { length: 50 }).notNull(),
    entityType: varchar("entity_type", { length: 100 }).notNull(),
    entityId: uuid("entity_id"),
    oldData: jsonb("old_data"),
    newData: jsonb("new_data"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("audit_factory_time").on(t.factoryId, t.createdAt)]
);

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  factories: many(factories),
}));

export const factoriesRelations = relations(factories, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [factories.organizationId],
    references: [organizations.id],
  }),
  userFactories: many(userFactories),
  materials: many(materials),
  products: many(products),
  productionEntries: many(productionEntries),
  materialEntries: many(materialEntries),
  expenses: many(expenses),
}));

export const usersRelations = relations(users, ({ many }) => ({
  userFactories: many(userFactories),
}));

export const userFactoriesRelations = relations(userFactories, ({ one }) => ({
  user: one(users, {
    fields: [userFactories.userId],
    references: [users.id],
  }),
  factory: one(factories, {
    fields: [userFactories.factoryId],
    references: [factories.id],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  factory: one(factories, {
    fields: [products.factoryId],
    references: [factories.id],
  }),
  compositions: many(productCompositions),
}));

export const productCompositionsRelations = relations(
  productCompositions,
  ({ one }) => ({
    product: one(products, {
      fields: [productCompositions.productId],
      references: [products.id],
    }),
    material: one(materials, {
      fields: [productCompositions.materialId],
      references: [materials.id],
    }),
  })
);

export const productionEntriesRelations = relations(
  productionEntries,
  ({ one, many }) => ({
    factory: one(factories, {
      fields: [productionEntries.factoryId],
      references: [factories.id],
    }),
    product: one(products, {
      fields: [productionEntries.productId],
      references: [products.id],
    }),
    createdByUser: one(users, {
      fields: [productionEntries.createdBy],
      references: [users.id],
    }),
    consumptions: many(materialConsumptions),
  })
);

export const materialConsumptionsRelations = relations(
  materialConsumptions,
  ({ one }) => ({
    factory: one(factories, {
      fields: [materialConsumptions.factoryId],
      references: [factories.id],
    }),
    productionEntry: one(productionEntries, {
      fields: [materialConsumptions.productionEntryId],
      references: [productionEntries.id],
    }),
    material: one(materials, {
      fields: [materialConsumptions.materialId],
      references: [materials.id],
    }),
  })
);

export const materialEntriesRelations = relations(
  materialEntries,
  ({ one }) => ({
    factory: one(factories, {
      fields: [materialEntries.factoryId],
      references: [factories.id],
    }),
    material: one(materials, {
      fields: [materialEntries.materialId],
      references: [materials.id],
    }),
    createdByUser: one(users, {
      fields: [materialEntries.createdBy],
      references: [users.id],
    }),
  })
);

export const expensesRelations = relations(expenses, ({ one }) => ({
  factory: one(factories, {
    fields: [expenses.factoryId],
    references: [factories.id],
  }),
  createdByUser: one(users, {
    fields: [expenses.createdBy],
    references: [users.id],
  }),
}));

export const materialBalancesRelations = relations(
  materialBalances,
  ({ one }) => ({
    factory: one(factories, {
      fields: [materialBalances.factoryId],
      references: [factories.id],
    }),
    material: one(materials, {
      fields: [materialBalances.materialId],
      references: [materials.id],
    }),
  })
);

export const materialsRelations = relations(materials, ({ one }) => ({
  factory: one(factories, {
    fields: [materials.factoryId],
    references: [factories.id],
  }),
}));
