/**
 * Run Neon DB migrations.
 * Usage: bun run src/db/migrate-neon.ts
 *
 * This creates the social tables in your Neon database.
 */
import { sql, testConnection } from "../lib/neon";
import { readFileSync } from "fs";
import { join } from "path";

async function migrate() {
  console.log("🔌 Testing Neon connection...");
  const ok = await testConnection();
  if (!ok) {
    console.error("❌ Could not connect to Neon. Check DATABASE_URL in .env");
    process.exit(1);
  }
  console.log("✅ Connected to Neon");

  const schemaPath = join(__dirname, "social.sql");
  const schema = readFileSync(schemaPath, "utf-8");

  // Split by semicolons and run each statement
  const statements = schema
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith("--"));

  for (const stmt of statements) {
    try {
      await sql.unsafe(stmt + ";");
      console.log(`  ✓ ${stmt.split("\n")[0].substring(0, 60)}...`);
    } catch (e: any) {
      console.error(`  ✗ ${e.message.substring(0, 100)}`);
    }
  }

  console.log("\n✅ Migration complete");
  process.exit(0);
}

migrate().catch((e) => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});
