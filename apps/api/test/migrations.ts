import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
export async function applyMigrations(db: PGlite) {
  for (const entry of readdirSync("prisma/migrations", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name)))
    await db.exec(
      readFileSync(`prisma/migrations/${entry.name}/migration.sql`, "utf8"),
    );
}
