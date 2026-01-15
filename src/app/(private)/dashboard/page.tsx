"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import AdminDashboard from "@/components/dashboard/admin/AdminDashboard";
import PatientDashboard from "@/components/dashboard/patient/PatientDashboard";
import PractitionerDashboard from "@/components/dashboard/practitioner/PractitionerDashboard";
import Loader from "@/components/atom/Loader/Loader";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "@/contexts/AuthContext";

type Role = "patient" | "practitioner" | "admin" | "superadmin";

export default function DashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  console.log(user)
  useEffect(() => {
    let mounted = true;

    async function loadRole() {
      try {
        const res = await authFetch("/api/auth/me");

        if (!res.ok) {
          throw new Error("Unauthorized");
        }

        const j = await res.json();
        const user = j.user;

        if (!user?.role) {
          throw new Error("No role");
        }

        if (!mounted) return;

        setRole(user.role);

        // Optional cache
        localStorage.setItem("user_role", user.role);

        if (user.role === "patient") {
          localStorage.setItem("user_id", user.patient_id);
        } else if (user.role === "practitioner") {
          localStorage.setItem("user_id", user.practitioner_id);
        } else {
          localStorage.setItem("user_id", user.auth_user_id);
        }
      } catch (err) {
        localStorage.removeItem("user_role");
        localStorage.removeItem("user_id");

        toast.error("Please login to access the dashboard.");
        router.push("/");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadRole();

    return () => {
      mounted = false;
    };
  }, [router]);

  /* ---------------- LOADING ---------------- */
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  /* ---------------- ROLE BASED ---------------- */
  if (role === "patient") return <PatientDashboard />;
  if (role === "practitioner") return <PractitionerDashboard />;
  if (role === "admin" || role === "superadmin")
    return <AdminDashboard />;

  // Fallback safety
  router.push("/");
  return null;
}
