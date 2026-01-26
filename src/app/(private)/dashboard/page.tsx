"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import AdminDashboard from "@/components/dashboard/admin/AdminDashboard";
import PatientDashboard from "@/components/dashboard/patient/[locale]/PatientDashboard";
import PractitionerDashboard from "@/components/dashboard/practitioner/PractitionerDashboard";
import Loader from "@/components/atom/Loader/Loader";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  /* ---------------- REDIRECT LOGIC ---------------- */
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  /* ---------------- LOADING ---------------- */
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  /* ---------------- UNAUTHENTICATED ---------------- */
  if (!user) {
    return null; // redirect handled in useEffect
  }

  /* ---------------- ROLE BASED DASHBOARD ---------------- */
  switch (user.role) {
    case "patient":
      return <PatientDashboard />;

    case "practitioner":
      return <PractitionerDashboard />;

    case "admin":
    case "superadmin":
      return <AdminDashboard />;

    default:
      return null;
  }
}
