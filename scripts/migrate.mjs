// Minimal forward-only migration runner.
//   node scripts/migrate.mjs           apply pending migrations
//   node scripts/migrate.mjs --reset   drop app tables, then apply from scratch
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "db", "migrations");
const reset = process.argv.includes("--reset");

const { DATABASE_URL, EMBEDDING_DIMENSIONS = "1024" } = process.env;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set (check .env.local).");
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

try {
  if (reset) {
    console.log("↺ resetting schema…");
    await client.query(`
      drop table if exists chunks, pages, document_files, documents cascade;
      drop table if exists _migrations cascade;
      drop function if exists match_chunks(vector, integer, uuid[]) cascade;
    `);
  }

  await client.query(`
    create table if not exists _migrations (
      name       text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const applied = new Set(
    (await client.query("select name from _migrations")).rows.map((r) => r.name),
  );

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(migrationsDir, file), "utf8").replaceAll(
      "{{EMBEDDING_DIMENSIONS}}",
      EMBEDDING_DIMENSIONS,
    );
    process.stdout.write(`→ applying ${file} … `);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into _migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log("ok");
      ran += 1;
    } catch (err) {
      await client.query("rollback");
      console.log("failed");
      throw err;
    }
  }

  console.log(ran === 0 ? "✓ already up to date" : `✓ applied ${ran} migration(s)`);
} finally {
  await client.end();
}
