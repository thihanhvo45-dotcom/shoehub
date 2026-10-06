import { describe, expect, it } from "vitest";
import { normalizeMysqlConnectionString } from "./mysql-connection";

describe("normalizeMysqlConnectionString", () => {
  it("translates Aiven ssl-mode into verified mysql2 TLS options", () => {
    const raw = "mysql://avnadmin:local-test@mysql.example:1234/defaultdb?ssl-mode=REQUIRED";
    const normalized = new URL(normalizeMysqlConnectionString(raw));
    const ssl = JSON.parse(normalized.searchParams.get("ssl") ?? "null");

    expect(normalized.searchParams.has("ssl-mode")).toBe(false);
    expect(ssl.ca).toContain("BEGIN CERTIFICATE");
    expect(ssl.rejectUnauthorized).toBe(true);
    expect(ssl.verifyIdentity).toBe(true);
    expect(normalized.hostname).toBe("mysql.example");
    expect(normalized.password).toBe("local-test");
  });

  it("leaves non-Aiven connection URLs unchanged", () => {
    const raw = "mysql://user:pass@localhost:3306/store";
    expect(normalizeMysqlConnectionString(raw)).toBe(raw);
  });

  it("rejects unsupported Aiven SSL modes", () => {
    const raw = "mysql://user:pass@localhost:3306/store?ssl-mode=DISABLED";
    expect(() => normalizeMysqlConnectionString(raw)).toThrow("Unsupported database ssl-mode");
  });
});
