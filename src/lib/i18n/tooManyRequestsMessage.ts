import { cookies } from "next/headers";
import en from "@/messages/en.json";
import si from "@/messages/si.json";

export async function tooManyRequestsMessage(): Promise<string> {
  const locale = (await cookies()).get("locale")?.value;
  return locale === "si"
    ? si.rateLimit.tooManyRequests
    : en.rateLimit.tooManyRequests;
}
