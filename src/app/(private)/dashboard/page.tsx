"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import AdminDashboard from "@/components/dashboard/admin/AdminDashboard";
import PatientDashboard from "@/components/dashboard/patient/PatientDashboard";
import PractitionerDashboard from "@/components/dashboard/practitioner/PractitionerDashboard";
import Loader from "@/components/atom/Loader/Loader";

export default function DashboardPage() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRole() {
      // 1️⃣ Check localStorage cache
      const cached = localStorage.getItem("user_role");
      if (cached) {
        setRole(cached);
        setLoading(false);
        return;
      }

      // 2️⃣ Fetch from backend
      try {
        const res = await axios.get("/api/auth/me");
        const r = res.data?.user?.role;

        if (r) {
          localStorage.setItem("user_role", r); // Cache role
          setRole(r);
        }
      } catch (err) {
        console.error("Error fetching user role", err);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    loadRole();
  }, []);

  // 3️⃣ Loading State
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  // 4️⃣ Role-Based Rendering
  if (role === "patient") return <PatientDashboard />;
  if (role === "practitioner") return <PractitionerDashboard />;
  if (role === "admin") return <AdminDashboard />;

  return (
    <div className="p-10 text-red-600 text-center">
      Unable to determine user role.
    </div>
  );
}
