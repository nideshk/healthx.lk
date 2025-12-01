"use client";

import React, { useEffect } from "react";
import Body from "../app/(public)/body/body";
import Footer from "../app/(public)/footer/footer";
import { toast } from "react-toastify";

export default function App() {

  return (
    <div className="min-h-screen font-sans antialiased bg-gradient-to-br from-white via-cyan-100 to-cyan-50">
      <Body />
      <Footer />
    </div>
  );
}

