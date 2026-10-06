import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const AIVEN_SSL_MODES = new Set(["REQUIRED", "VERIFY_CA", "VERIFY_IDENTITY"]);
const AIVEN_CA_PATH = resolve(process.cwd(), "server/certs/aiven-project-ca.pem");

/**
 * mysql2 treats `ssl-mode` in a MySQL URI as an unknown option. Convert the
 * Aiven URI into mysql2's JSON `ssl` option and verify both the project CA and
 * server identity. This helper is shared with drizzle-kit so migrations use
 * the same TLS policy as the running application.
 */
export function normalizeMysqlConnectionString(connectionString: string): string {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("ssl-mode");
  if (!sslMode) return connectionString;

  if (!AIVEN_SSL_MODES.has(sslMode.toUpperCase())) {
    throw new Error(`Unsupported database ssl-mode: ${sslMode}`);
  }

  url.searchParams.delete("ssl-mode");
  url.searchParams.set(
    "ssl",
    JSON.stringify({
      ca: readFileSync(AIVEN_CA_PATH, "utf8"),
      rejectUnauthorized: true,
      verifyIdentity: true,
    }),
  );
  return url.toString();
}
