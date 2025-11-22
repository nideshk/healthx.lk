export function getTimeUntil(startISO: string) {
  const now = new Date();
  const start = new Date(startISO);

  // Compare DATES only (important)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const apptDay = new Date(start);
  apptDay.setHours(0, 0, 0, 0);

  // If appointment is in the future (different day)
  if (apptDay > today) {
    const diffMs = start.getTime() - now.getTime();
    const diffMin = Math.round(diffMs / 60000);

    if (diffMin < 60) return `In ${diffMin} min`;
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    if (mins === 0) return `In ${hours} hr`;
    return `In ${hours} hr ${mins} min`;
  }

  // If appointment is today
  if (apptDay.getTime() === today.getTime()) {
    console.log("Appointment is today");
    console.log({ now, start });
    const diffMs = start.getTime() - now.getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin > 0) {
      if (diffMin < 60) return `In ${diffMin} min`;
      const hours = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      if (mins === 0) return `In ${hours} hr`;
      return `In ${hours} hr ${mins} min`;
    }

    if (diffMin === 0) return "Starting now";
    console.log("diffMin:", diffMin);
    if (diffMin < 0) return "Started";
  }

  // If appointment day has passed
  return "Past";
}
export function canJoinSession(startISO: string) {
  const now = new Date();
  const start = new Date(startISO);

  const diffMs = start.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);

  // If already started or within next 10 minutes
  return diffMin <= 10;
}
