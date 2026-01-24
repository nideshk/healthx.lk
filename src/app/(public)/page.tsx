"use client";

import React from "react";
import Body from "./body/body";
import Footer from "@/components/homepage/footer/footer";

export default function Page() {
  return (
    <div className="min-h-screen font-sans antialiased bg-gradient-to-br from-white via-cyan-100 to-cyan-50">
      <Body />
      <Footer />
    </div>
  );
}
