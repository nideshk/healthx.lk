// src\app\(private)\layout.tsx

import { requireUser } from "@/lib/authGuard";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
// import { cookies } from "next/headers"; // <-- CRITICAL IMPORT

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {authorized} = await requireUser();
  if(!authorized){
    redirect("/")
  }
  return <>{children}</>;
}
