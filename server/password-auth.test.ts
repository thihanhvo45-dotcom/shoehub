import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { consumeAuthAttempt, hashPassword, verifyPassword } from "./password-auth";

describe("email/password account security helpers", () => {
  it("hashes passwords with a unique salt and verifies only the original password", async () => {
    const firstHash = await hashPassword("correct horse battery staple");
    const secondHash = await hashPassword("correct horse battery staple");

    expect(firstHash).not.toBe("correct horse battery staple");
    expect(firstHash).not.toBe(secondHash);
    expect(await verifyPassword("correct horse battery staple", firstHash)).toBe(true);
    expect(await verifyPassword("incorrect password", firstHash)).toBe(false);
  });

  it("rejects malformed password hashes safely", async () => {
    expect(await verifyPassword("anything", "plain-text-password")).toBe(false);
    expect(await verifyPassword("anything", "scrypt$salt$bad-digest")).toBe(false);
  });

  it("limits repeated authentication attempts within the configured window", () => {
    const key = `test-rate-limit-${randomUUID()}`;
    expect(consumeAuthAttempt(key, 2)).toBe(true);
    expect(consumeAuthAttempt(key, 2)).toBe(true);
    expect(consumeAuthAttempt(key, 2)).toBe(false);
  });
});
