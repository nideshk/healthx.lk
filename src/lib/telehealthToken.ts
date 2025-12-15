import jwt from "jsonwebtoken";

const TELEHEALTH_JWT_SECRET = process.env.TELEHEALTH_JWT_SECRET!;
const TELEHEALTH_TOKEN_TTL_SECONDS = 10 * 60; // 10 minutes

if (!TELEHEALTH_JWT_SECRET) {
  throw new Error("TELEHEALTH_JWT_SECRET is not set");
}

export type TelehealthTokenPayload = {
  appointmentId: string;
  roomKey: string;
  role: "patient" | "practitioner" | "attendee" | "guest";
  sub: string; // user id or guest email
};

export function signTelehealthToken(payload: TelehealthTokenPayload) {
  return jwt.sign(payload, TELEHEALTH_JWT_SECRET, {
    expiresIn: TELEHEALTH_TOKEN_TTL_SECONDS,
  });
}

export function verifyTelehealthToken(token: string): TelehealthTokenPayload {
  return jwt.verify(token, TELEHEALTH_JWT_SECRET) as TelehealthTokenPayload;
}
