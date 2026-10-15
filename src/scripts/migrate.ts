import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
import { readFileSync } from "fs";
import { join } from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const client = postgres(DATABASE_URL);

async function migrate() {
  const sqlFile = readFileSync(
    join(process.cwd(), "drizzle", "0000_condemned_dazzler.sql"),
    "utf-8"
  );

  const statements = sqlFile
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`Running ${statements.length} statements...\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\n/g, " ");
    try {
      await client.unsafe(stmt);
      console.log(`  [${i + 1}/${statements.length}] OK: ${preview}...`);
    } catch (err: any) {
      if (err.message?.includes("already exists")) {
        console.log(`  [${i + 1}/${statements.length}] SKIP (exists): ${preview}...`);
      } else {
        console.error(`  [${i + 1}/${statements.length}] FAIL: ${preview}...`);
        console.error(`    ${err.message}`);
        await client.end();
        process.exit(1);
      }
    }
  }

  console.log("\nMigration complete!");
  await client.end();
}

migrate();
