import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "../config/env.js";
import * as schema from "./schema/index.js";

let connection: ReturnType<typeof postgres> | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (db) {
    return db;
  }

  const env = getEnv();
  const connectionString = env.DATABASE_URL;

  connection = postgres(connectionString, {
    ssl: { rejectUnauthorized: false },
  });

  db = drizzle(connection, { schema });

  return db;
}

export async function closeDb() {
  if (connection) {
    await connection.end();
    connection = null;
    db = null;
  }
}
