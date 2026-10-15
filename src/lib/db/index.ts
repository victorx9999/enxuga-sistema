import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import * as weighingSchema from "./weighing-schema";

const isProduction = process.env.NODE_ENV === "production";
const client = postgres(process.env.DATABASE_URL!, {
  ssl: isProduction ? "require" : false,
  prepare: false,
});
export const db = drizzle(client, { schema: { ...schema, ...weighingSchema } });
