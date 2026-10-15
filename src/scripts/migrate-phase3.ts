import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!);

async function migrate() {
  console.log("Creating Phase 3 tables...\n");

  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS "weighings" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "factory_id" uuid NOT NULL REFERENCES "factories"("id"),
      "material_id" uuid REFERENCES "materials"("id"),
      "date" date NOT NULL,
      "month" varchar(7) NOT NULL,
      "weight_kg" numeric(12, 4) NOT NULL,
      "photo_url" text,
      "notes" text,
      "created_by" uuid REFERENCES "users"("id"),
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);
  console.log("  weighings table created");

  await client.unsafe(`
    CREATE INDEX IF NOT EXISTS "weighing_factory_month" ON "weighings" ("factory_id", "month");
  `);

  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS "losses" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "factory_id" uuid NOT NULL REFERENCES "factories"("id"),
      "product_id" uuid REFERENCES "products"("id"),
      "material_id" uuid REFERENCES "materials"("id"),
      "date" date NOT NULL,
      "month" varchar(7) NOT NULL,
      "weight_kg" numeric(12, 4) NOT NULL,
      "reason" text,
      "created_by" uuid REFERENCES "users"("id"),
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);
  console.log("  losses table created");

  await client.unsafe(`
    CREATE INDEX IF NOT EXISTS "loss_factory_month" ON "losses" ("factory_id", "month");
  `);

  console.log("\nPhase 3 migration complete!");
  await client.end();
}

migrate();
