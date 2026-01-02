"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import AdminDashboard from "@/components/dashboard/admin/AdminDashboard";
import PatientDashboard from "@/components/dashboard/patient/PatientDashboard";
import PractitionerDashboard from "@/components/dashboard/practitioner/PractitionerDashboard";
import Loader from "@/components/atom/Loader/Loader";
import { redirect } from "next/navigation";
import { toast } from "react-toastify";

type Role = "patient" | "practitioner" | "admin" | "superadmin";

export default function DashboardPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRole() {
      try {
        const res = await axios.get("/api/auth/me");
        const user = res.data?.user;

        if (!user?.role) {
          throw new Error("No role");
        }

        // ✅ SOURCE OF TRUTH = BACKEND
        setRole(user.role);

        // Optional cache (safe now)
        localStorage.setItem("user_role", user.role);

        if (user.role === "patient") {
          localStorage.setItem("user_id", user.patient_id);
        } else if (user.role === "practitioner") {
          localStorage.setItem("user_id", user.practitioner_id);
        } else if (user.role === "admin") {
          localStorage.setItem("user_id", user.admin_id);
        }
      } catch (err) {
        // ❌ Clear stale cache
        localStorage.removeItem("user_role");
        localStorage.removeItem("user_id");

        toast.error("Please login to access the dashboard.");
        redirect("/");
      } finally {
        setLoading(false);
      }
    }

    loadRole();
  }, []);

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
  if (role === "admin" || role === "superadmin") return <AdminDashboard />;

  redirect("/");
}
