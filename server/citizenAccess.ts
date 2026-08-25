import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function normaliseCitizenAccessCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function createCitizenAccessCode() {
  return `FSC-${randomBytes(20).toString("hex").toUpperCase()}`;
}

export function hashCitizenAccessCode(value: string) {
  return createHash("sha256").update(normaliseCitizenAccessCode(value)).digest("hex");
}

export function matchesCitizenAccessCode(storedHash: string | null | undefined, suppliedCode: string) {
  if (!storedHash) return false;
  const expected = Buffer.from(storedHash, "hex");
  const actual = Buffer.from(hashCitizenAccessCode(suppliedCode), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
