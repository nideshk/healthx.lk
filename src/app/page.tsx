"use client";
import React from "react";
// FIX: Changed import aliases (@/components/...) to relative paths (../components/...)
import Body from "../app/(public)/body/body"; // Server Component
import Footer from "../app/(public)/footer/footer"; // Server Component (New Dark Style)

export default function App() {

  return (
    <div className="min-h-screen font-sans antialiased bg-gradient-to-br from-white via-cyan-100 to-cyan-50">
      <Body />
      <Footer />
    </div>
  );
}
