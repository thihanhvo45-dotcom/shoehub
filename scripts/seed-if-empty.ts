import { spawnSync } from "node:child_process";
import { createPool } from "mysql2/promise";
import { normalizeMysqlConnectionString } from "../server/mysql-connection";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required for initial catalog seed");
  const pool = createPool({ uri: normalizeMysqlConnectionString(connectionString), connectionLimit: 1 });
  let productCount = 0;
  try {
    const [rows] = await pool.query("SELECT COUNT(*) AS count FROM products");
    productCount = Number((rows as Array<{ count: number | string }>)[0]?.count ?? 0);
  } finally {
    await pool.end();
  }

  if (productCount > 0) {
    console.log(`Initial catalog seed skipped; ${productCount} product(s) already exist.`);
    return;
  }

  console.log("No products found; seeding the initial ShoeHub catalog and inventory.");
  const result = spawnSync("pnpm", ["run", "db:seed"], { stdio: "inherit", env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`db:seed exited with status ${result.status}`);
}

main().catch(error => {
  console.error("Initial catalog seed failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
