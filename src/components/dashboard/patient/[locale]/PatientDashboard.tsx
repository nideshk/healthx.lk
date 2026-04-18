"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { DEFAULT_PATIENT_TAB, PatientTab } from "./patientTabs";
import PatientDashboardLayout from "./PatientDashboardLayout";

export default function PatientDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tab =
    (searchParams.get("tab") as PatientTab) ||
    DEFAULT_PATIENT_TAB;

  useEffect(() => {
    const validTabs = ["appointment", "reschedule", "prescriptions", "file-manager", "follow-up"];
    if (!validTabs.includes(tab)) {
      router.replace(`/dashboard?tab=${DEFAULT_PATIENT_TAB}`);
    }
  }, [tab, router]);

  return <PatientDashboardLayout activeTab={tab} />;
}
