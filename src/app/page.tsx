"use client"
import React from "react";
// FIX: Changed import aliases (@/components/...) to relative paths (../components/...)
import Body from "../app/(public)/body/body"; // Server Component
import Footer from "../app/(public)/footer/footer"; // Server Component (New Dark Style)
import { useModalStore } from "../store/useModalStore";

import Modal from "@/components/atom/Modal/Modal";
import ClinicianCard from "@/components/admin/ClinicianCard";
import PractitionerDashboard from "@/components/dashboard/practitioner/PractitionerDashboard";
import Button from "@/components/atom/Button/Button";

// This file remains a pure Server Component, responsible only for layout and assembly.

export default  function  App() {
  return (
    <div className="min-h-screen font-sans antialiased bg-gradient-to-br from-white via-cyan-100 to-cyan-50">
      <Body />
      <Modal isOpen={false} onClose={() => {}} title="Sample Modal" theme="light">modal</Modal>
      <Footer />
    </div>
  );
}
