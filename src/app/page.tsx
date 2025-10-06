"use client";

import { useEffect } from "react";

export default function Home() {
  const fetchCliniko = async () => {
    const response = await fetch("/api/cliniko-users");
    const data = await response.json();
    console.log(data);
  };

  useEffect(() => {
    fetchCliniko();
  }, []);

  return <div>Check console for Cliniko response</div>;
}
