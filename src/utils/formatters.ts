const SINHALA_DIGITS = ["෦","෧","෨","෩","෪","෫","෬","෭","෮","෯"];

function toSinhalaDigits(value: string) {
  return value.replace(/\d/g, d => SINHALA_DIGITS[Number(d)]);
}

export function formatNumber(
  value: number,
  locale: "en" | "si"
) {
  const formatted = new Intl.NumberFormat("en-US").format(value);
  return locale === "si" ? toSinhalaDigits(formatted) : formatted;
}

export function formatDate(
  date: Date | string,
  locale: "en" | "si"
) {
  const formatted = new Intl.DateTimeFormat(
    locale === "si" ? "si-LK" : "en-US",
    { day: "numeric", month: "short" }
  ).format(new Date(date));

  return locale === "si" ? toSinhalaDigits(formatted) : formatted;
}

export function formatTime(
  date: Date | string,
  locale: "en" | "si"
) {
  const formatted = new Intl.DateTimeFormat(
    locale === "si" ? "si-LK" : "en-US",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }
  ).format(new Date(date));

  return locale === "si" ? toSinhalaDigits(formatted) : formatted;
}

export function formatTimeLeft(
  targetIso: string,
  locale: "en" | "si"
) {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (diff <= 0) return "now";

  const mins = Math.floor(diff / 60000);
  let result = "";
  
  if (mins < 60) {
    result = `${mins} min`;
  } else {
    const hours = Math.floor(mins / 60);
    if (hours < 24) {
      result = `${hours}h ${mins % 60}m`;
    } else {
      result = `${Math.floor(hours / 24)}d`;
    }
  }

  return locale === "si" ? toSinhalaDigits(result) : result;
}