"use client";
import React from "react";
// FIX: Changed import aliases (@/components/...) to relative paths (../components/...)
import Header from "../app/(public)/header/header"; // Server Component (Pure CSS for interactivity)
import Body from "../app/(public)/body/body"; // Server Component
import Footer from "../app/(public)/footer/footer"; // Server Component (New Dark Style)
import LoginModal from "./(public)/login/page";
import { useModalStore } from "../store/useModalStore";
import Registration from "./(public)/register/page";
import Consultation from "./(private)/consultation/page";
import AttendeeSelection from "./(private)/attendee-selection/page";
import DoctorSelection from "./(private)/doctor-selection/page";
import AppointmentBooking from "./(private)/book-appointment/page";
import Button from "@/components/Button/Button";
import Calendar from "@/components/atom/Calendar/Calendar";
import Dropdown from "@/components/Dropdown/Dropdown";
import Modal from "@/components/atom/Modal/Modal";

// This file remains a pure Server Component, responsible only for layout and assembly.

export default function App() {
  const { isLoginModalOpen } = useModalStore();

  return (
    <div className="min-h-screen font-sans antialiased bg-gradient-to-br from-white via-cyan-100 to-cyan-50">
      <Header />
      <Body />
      <Modal isOpen={false} onClose={() => {}} title="Sample Modal" theme="light">modal</Modal>
      {/* <Dropdown label="Sample Dropdown" ]} /> */}
      <Footer />
      {isLoginModalOpen && <LoginModal />}
    </div>
  );
}
