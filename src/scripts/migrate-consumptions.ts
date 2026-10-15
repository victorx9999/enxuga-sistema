import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

async function migrate() {
  console.log("Creating material_consumptions table...");

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS material_consumptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      factory_id uuid NOT NULL REFERENCES factories(id),
      production_entry_id uuid NOT NULL REFERENCES production_entries(id) ON DELETE CASCADE,
      material_id uuid NOT NULL REFERENCES materials(id),
      month varchar(7) NOT NULL,
      weight_kg numeric(12, 4) NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL
    )
  `);
  console.log("Table created.");

  await sql.unsafe(`CREATE INDEX IF NOT EXISTS consumption_factory_month ON material_consumptions USING btree (factory_id, month)`);
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS consumption_production ON material_consumptions USING btree (production_entry_id)`);
  console.log("Indexes created.");

  await sql.end();
  console.log("Done.");
}

migrate().catch((e) => { console.error(e); sql.end(); process.exit(1); });
