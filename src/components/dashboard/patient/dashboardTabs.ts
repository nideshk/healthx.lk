// dashboardTabs.ts
export type DashboardTab =
  | "appointment"
  | "reschedule"
  | "file-manager"
  | "follow-up";

export const DEFAULT_TAB: DashboardTab = "appointment";
