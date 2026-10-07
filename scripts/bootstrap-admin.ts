import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2";
import { users } from "../drizzle/schema";
import { hashPassword } from "../server/password-auth";
import { normalizeMysqlConnectionString } from "../server/mysql-connection";

async function main() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !password) {
    console.log("Admin bootstrap skipped; no temporary admin credentials are configured.");
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for admin bootstrap");
  if (password.length < 16) throw new Error("ADMIN_BOOTSTRAP_PASSWORD must be at least 16 characters");

  const pool = createPool({ uri: normalizeMysqlConnectionString(process.env.DATABASE_URL), connectionLimit: 1 });
  try {
    const db = drizzle(pool);
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing[0]) {
      if (existing[0].role !== "admin") throw new Error("The configured admin email is already used by a non-admin account; no role change was made");
      console.log("An admin account already exists; credentials were not changed.");
      return;
    }

    await db.insert(users).values({
      openId: `email:${randomUUID()}`,
      name: process.env.ADMIN_BOOTSTRAP_NAME?.trim() || "ShoeHub Administrator",
      email,
      loginMethod: "password",
      passwordHash: await hashPassword(password),
      role: "admin",
      lastSignedIn: new Date(),
    });
    console.log("ShoeHub administrator account created.");
  } finally {
    await new Promise<void>((resolve, reject) => pool.end(error => error ? reject(error) : resolve()));
  }
}

main().catch(error => {
  console.error("Admin bootstrap failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
