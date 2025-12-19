"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import AdminDashboard from "@/components/dashboard/admin/AdminDashboard";
import PatientDashboard from "@/components/dashboard/patient/PatientDashboard";
import PractitionerDashboard from "@/components/dashboard/practitioner/PractitionerDashboard";
import Loader from "@/components/atom/Loader/Loader";
import { redirect } from "next/navigation";
import { toast } from "react-toastify";

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
        let userid ;
        if(role === "patient"){
         userid = res.data?.user?.patient_id;
        }
        else if(role === "practitioner"){
         userid = res.data?.user?.practitioner_id;
        }
        if (r) {
          localStorage.setItem("user_role", r); // Cache role
          localStorage.setItem("user_id", userid); // Cache user id
          setRole(r);
        }
      } catch (err) {
        toast.error("Please login to access the dashboard.");
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
  if (role === "patient") {
    return <PatientDashboard />;}
  if (role === "practitioner"){ 
    return <PractitionerDashboard />;
  }
  if  (role === "admin") {
    return <AdminDashboard />;
  }
  else{
    redirect("/")
  }
}
