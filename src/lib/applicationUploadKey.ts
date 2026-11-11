import { createHmac, timingSafeEqual } from "crypto";

const PURPOSE = "practitioner-application-document-upload";
// About 2 hours. Not single-use: nothing in the schema records that a key was consumed.
const TTL_MS = 2 * 60 * 60 * 1000;

export const APPLICATION_UPLOAD_KEY_HEADER = "x-application-upload-key";

type UploadKeyPayload = {
  applicationId: string;
  purpose: string;
  exp: number;
};

function uploadSecret(): string | null {
  const secret = process.env.APPLICATION_UPLOAD_SECRET;
  if (!secret) {
    console.warn(
      "[application-upload] APPLICATION_UPLOAD_SECRET is not set; refusing upload key"
    );
    return null;
  }
  return secret;
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** True when a key can be signed. Logs and returns false if the secret is unset. */
export function applicationUploadSecretReady(): boolean {
  return uploadSecret() !== null;
}

/**
 * Stateless HMAC of application id, purpose, and a 2-hour expiry.
 * Returns null when APPLICATION_UPLOAD_SECRET is unset.
 */
export function issueApplicationUploadKey(applicationId: string): string | null {
  const secret = uploadSecret();
  if (!secret) return null;

  const body = Buffer.from(
    JSON.stringify({
      applicationId,
      purpose: PURPOSE,
      exp: Date.now() + TTL_MS,
    } satisfies UploadKeyPayload)
  ).toString("base64url");

  return `${body}.${signPayload(body, secret)}`;
}

export function readApplicationUploadKey(req: Request): string | null {
  const value = req.headers.get(APPLICATION_UPLOAD_KEY_HEADER);
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * True only when the token's signature matches and it was issued for
 * this exact application id, purpose, and an unexpired window.
 * A missing token is false and does not log. A presented token with
 * no secret fails closed.
 */
export function applicationUploadKeyAllows(
  token: string | null | undefined,
  applicationId: string
): boolean {
  if (!token || !applicationId) return false;

  const secret = uploadSecret();
  if (!secret) return false;

  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;

  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = signPayload(body, secret);
  const providedBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);

  if (
    providedBuf.length !== expectedBuf.length ||
    !timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return false;
  }

  let parsed: UploadKeyPayload;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return false;
  }

  if (parsed.purpose !== PURPOSE) return false;
  if (parsed.applicationId !== applicationId) return false;
  if (typeof parsed.exp !== "number" || !Number.isFinite(parsed.exp)) return false;
  if (Date.now() > parsed.exp) return false;

  return true;
}
