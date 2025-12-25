import crypto from "crypto";

/**
 * Crypto utility functions for encrypting and decrypting sensitive short-lived data.
 *
 * ## Algorithm
 * - AES-256-CBC (symmetric encryption)
 * - 32-byte secret key (hex-encoded) provided via `JWT_SALT_KEY`
 * - 16-byte random Initialization Vector (IV) generated per encryption
 *
 * ## Encrypted Format
 * Encrypted values are stored as a single string in the following format:
 *
 *   ivHex:encryptedHex
 *
 * Where:
 * - `ivHex` is the 16-byte IV encoded as hex
 * - `encryptedHex` is the AES-256-CBC encrypted payload encoded as hex
 *
 * Example:
 *   "9f8c1a...e4d2:3abf91...c02e"
 *
 * ## Intended Usage
 * - Short-lived sensitive values (e.g., application passwords)
 * - Data that must be recoverable later (NOT password hashing)
 *
 * ## Security Notes
 * - This is NOT a replacement for password hashing (bcrypt/argon2)
 * - Encrypted values should be treated as sensitive and cleared once used
 * - The `decrypt` function is intentionally defensive and returns `null`
 *   if the input is malformed, corrupted, or cannot be decrypted
 * - No exceptions are thrown from these utilities
 *
 * ## Key Management
 * - `JWT_SALT_KEY` must be exactly 64 hex characters (32 bytes)
 * - Changing the key will invalidate all previously encrypted values
 */

const SECRET = process.env.JWT_SALT_KEY;

if (!SECRET || SECRET.length !== 64) {
  console.error("JWT_SALT_KEY is missing or invalid");
}

const KEY = Buffer.from(SECRET!, "hex"); // 32 bytes

/* --------------------------------------------------
 * Encrypt
 * -------------------------------------------------- */
export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    KEY,
    iv
  );

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`;
};

/* --------------------------------------------------
 * Decrypt (SAFE)
 * -------------------------------------------------- */
export const decrypt = (text: string): string | null => {
  try {
    if (!text || typeof text !== "string") {
      return null;
    }

    const parts = text.split(":");
    if (parts.length !== 2) {
      return null;
    }

    const [ivHex, encrypted] = parts;

    if (!ivHex || !encrypted) {
      return null;
    }

    const iv = Buffer.from(ivHex, "hex");
    if (iv.length !== 16) {
      return null;
    }

    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      KEY,
      iv
    );

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.error("DECRYPT FAILED", err);
    return null;
  }
};
