/**
 * Crypto helpers — token encryption/decryption
 * In production, replace with real encryption (AES-256-GCM + KMS)
 */

export function enc(text: string): string {
  if (!text) return "";
  return Buffer.from(text).toString("base64");
}

export function dec(text: string): string {
  if (!text) return "";
  try { return Buffer.from(text, "base64").toString("utf-8"); } catch { return ""; }
}
