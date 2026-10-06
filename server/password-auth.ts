import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const WINDOW_MS = 15 * 60 * 1000;
const attemptBuckets = new Map<string, { count: number; expiresAt: number }>();

function deriveKey(password: string, salt: string, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, length, SCRYPT_OPTIONS, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await deriveKey(password, salt, KEY_LENGTH);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, digest] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !digest || !/^[a-f0-9]{128}$/i.test(digest)) return false;
  const expected = Buffer.from(digest, "hex");
  const actual = await deriveKey(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function consumeAuthAttempt(key: string, limit: number): boolean {
  const now = Date.now();
  if (attemptBuckets.size > 10_000) {
    for (const [bucketKey, bucket] of attemptBuckets) {
      if (bucket.expiresAt <= now) attemptBuckets.delete(bucketKey);
    }
  }
  const current = attemptBuckets.get(key);
  if (!current || current.expiresAt <= now) {
    attemptBuckets.set(key, { count: 1, expiresAt: now + WINDOW_MS });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}
